# Itinerary Cover Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user upload their own itinerary cover image on the last wizard page; when they don't, the banner falls back to the warm golden-hour gradient with a centered low-opacity NavQuest brand mark.

**Architecture:** Reuse the existing avatar-upload pattern (multer memory storage → Supabase Storage bucket → public URL saved on the row) against a new `itinerary-covers` bucket, reusing the existing `coverImageUrl` column (no migration). The itinerary doesn't exist during the wizard, so the file is held in wizard `form` state and uploaded from the LoadingPage after the itinerary is created (non-fatal on failure). `persist.js` stops auto-deriving the cover from placeholder venue images (defaults to `null`), so the branded gradient shows for every no-upload itinerary. The banner gains a CSS diamond mark shown only when there's no cover image.

**Tech Stack:** Express 5 + multer (already a dependency) + Supabase Storage; React 19 (Vite) + axios FormData; `node --test` for backend service tests.

## Global Constraints

- **No new dependencies.** `multer` is already in `backend/package.json`; the frontend uses the existing shared `api` axios client.
- **No DB migration.** Reuse the existing `Itinerary.coverImageUrl` column.
- **Do not commit unless the user asks** (`.claude/rules/git.md`). Leave changes in the working tree; commit steps below are for when the executor is authorized. No `Co-Authored-By` trailer, imperative subject ≤50 chars.
- **Layering** (`.claude/rules/backend.md`): controllers touch `req`/`res` and call models/lib; the ONLY place `process.env` is read is `lib/`; all DB access goes through a model. Routes wire URL→handler + middleware only.
- **Convention: routes/controllers/middleware are NOT unit-tested** in this repo (only pure service/util logic is) — matches the untested `uploadUserAvatar`. Do not add a controller test.
- **Upload limits mirror avatars:** multer `memoryStorage()`, 5 MB cap, `image/*` only.
- **Verify backend with:** `cd backend && npm test` (all green). **Verify frontend with:** `cd frontend && npm run lint && npm run build` (both clean).
- **Prerequisite (user action, NOT code):** a public Supabase Storage bucket named `itinerary-covers` must exist (same config as `avatars`). Until it does, uploads 500 — caught and non-fatal (itinerary still saves, banner shows the gradient+mark). Call this out in manual verification.

---

### Task 1: Backend — cover upload endpoint

**Files:**
- Modify: `backend/lib/supabase.js` (generalize the upload helper, add cover bucket)
- Modify: `backend/controllers/itineraryController.js` (add `uploadItineraryCover`)
- Modify: `backend/routes/itineraryRoutes.js` (add route + multer)
- Modify: `backend/services/itinerary/persist.js` (default cover to `null`)
- Test: `backend/services/itinerary/persist.test.js` (only if an assertion breaks — see Step 5)

**Interfaces:**
- Consumes: `loadOwned(res, find, id, userId, { label, action })` and `parseIdParam(req, res, label)` from `controllers/helpers.js`; `itineraries.findByIdBasic(id)` and `itineraries.update(id, data)` from `models/itineraries.js`.
- Produces: `POST /itineraries/:id/cover` (multipart, field name `cover`) → returns the updated itinerary JSON. `uploadImage({ bucket, path, buffer, contentType }) → publicUrl` exported from `lib/supabase.js`.

- [ ] **Step 1: Generalize the upload helper in `lib/supabase.js`**

Replace the `AVATAR_BUCKET` constant + `uploadAvatar` function with a shared `uploadImage` plus a thin `uploadAvatar` wrapper and a new cover-bucket constant. Find this block:

```js
const AVATAR_BUCKET = 'avatars'

// Uploads an avatar image to the `avatars` bucket and returns its public URL.
// `path` is the object key (e.g. `123/avatar.png`); an existing object at the
// same key is overwritten so a user keeps a single avatar file.
async function uploadAvatar({ path, buffer, contentType }) {
  const { error } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, { contentType, upsert: true })

  if (error) throw error

  const { data } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
```

Replace it with:

```js
const AVATAR_BUCKET = 'avatars'
const ITINERARY_COVER_BUCKET = 'itinerary-covers'

// Uploads an image to a Storage bucket and returns its public URL. `path` is the
// object key (e.g. `123/cover.png`); an existing object at the same key is
// overwritten (upsert) so each owner keeps a single file per resource.
async function uploadImage({ bucket, path, buffer, contentType }) {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true })

  if (error) throw error

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Uploads a user avatar to the `avatars` bucket. Thin wrapper over uploadImage.
async function uploadAvatar({ path, buffer, contentType }) {
  return uploadImage({ bucket: AVATAR_BUCKET, path, buffer, contentType })
}

// Uploads an itinerary cover to the `itinerary-covers` bucket.
async function uploadItineraryCoverImage({ path, buffer, contentType }) {
  return uploadImage({ bucket: ITINERARY_COVER_BUCKET, path, buffer, contentType })
}
```

Then update the export line at the bottom of the file:

```js
export { uploadAvatar, uploadItineraryCoverImage, updateUserPassword }
```

- [ ] **Step 2: Add the controller `uploadItineraryCover`**

In `backend/controllers/itineraryController.js`, add `uploadItineraryCoverImage` to the `lib/supabase.js` import. There is currently no import from `../lib/supabase.js` in this file — add one near the top imports:

```js
import { uploadItineraryCoverImage } from '../lib/supabase.js'
```

Then add this function (place it near `copyItinerary`, and add it to the file's export list):

```js
// POST /itineraries/:id/cover
// Uploads a cover image the caller owns to Supabase Storage and saves its public
// URL on the itinerary. Mirrors uploadUserAvatar. Owner-gated via loadOwned.
async function uploadItineraryCover(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  // 404 if missing, 403 if not the owner (sets the response itself).
  const owned = await loadOwned(res, itineraries.findByIdBasic, id, req.user.id, {
    label: 'Itinerary',
    action: 'modify',
  })
  if (!owned) return

  const file = req.file
  if (!file) {
    return res.status(400).json({ error: 'No image file provided' })
  }
  if (!file.mimetype?.startsWith('image/')) {
    return res.status(400).json({ error: 'Cover must be an image file' })
  }

  try {
    // One object per itinerary, keyed by id — upsert overwrites the old cover.
    // The query string busts the CDN cache so the new image shows immediately.
    const ext = file.mimetype.split('/')[1] || 'png'
    const publicUrl = await uploadItineraryCoverImage({
      path: `${id}/cover.${ext}`,
      buffer: file.buffer,
      contentType: file.mimetype,
    })
    const coverImageUrl = `${publicUrl}?v=${id}-${file.size}`

    const updated = await itineraries.update(id, { coverImageUrl })
    return res.status(200).json(updated)
  } catch (err) {
    console.error('uploadItineraryCover error:', err)
    return res
      .status(500)
      .json({ error: 'Could not upload the cover image. Please try again.' })
  }
}
```

Add `uploadItineraryCover` to the existing `export {` list at the bottom of the file.

- [ ] **Step 3: Wire the route with multer**

In `backend/routes/itineraryRoutes.js`, add the multer import + config and the route. At the top, after the existing imports, add:

```js
import multer from 'multer'
```

Add `uploadItineraryCover` to the destructured import from `../controllers/itineraryController.js`.

After `const router = express.Router()`, add:

```js
// Cover images go straight to Supabase Storage, so keep the file in memory
// (never on disk) and cap the size to keep uploads sane. Matches the avatar route.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
})
```

And add the route alongside the other `/:id/*` routes (e.g. after the copy route):

```js
router.post('/:id/cover', requireAuth, upload.single('cover'), uploadItineraryCover)
```

- [ ] **Step 4: Default the cover to null in `persist.js`**

In `backend/services/itinerary/persist.js`, inside `persistItinerary` (around lines 166–169), remove the first-venue derivation. Find:

```js
  // Cover image derives from the first stop's venue pin
  const byId = new Map(shortlist.map((p) => [p.id, p]))
  const firstVenue = itinerary.stops.length > 0 ? byId.get(itinerary.stops[0].pinId) : null
  const coverImageUrl = firstVenue?.locationImageUrl ?? null
```

Replace with:

```js
  // Cover image is set only by an explicit user upload (POST /itineraries/:id/cover);
  // default to null so the banner shows the branded gradient fallback.
  const coverImageUrl = null
```

NOTE: there is a SEPARATE `byId` map inside `stopsToStops` (around line 52) — do NOT touch that one; only remove the `byId`/`firstVenue` lines inside `persistItinerary`.

- [ ] **Step 5: Run backend tests**

Run: `cd backend && npm test`
Expected: all green. If `persist.test.js` has an assertion expecting a derived `coverImageUrl`, change it to expect `null`. (At plan time, `rg "coverImageUrl" backend/services/itinerary/persist.test.js` returned nothing, so no change is expected — but confirm.)

- [ ] **Step 6: Boot check**

Run: `cd backend && node -e "import('./index.js').then(() => { console.log('boot ok'); process.exit(0) }).catch(e => { console.error(e); process.exit(1) })"`
Expected: `boot ok` (route wiring + imports resolve). If it hangs because the server keeps listening, that's fine — Ctrl-C after seeing no import error, or trust `npm test` + lint.

- [ ] **Step 7: Commit (only if authorized)**

```bash
git add backend/lib/supabase.js backend/controllers/itineraryController.js \
        backend/routes/itineraryRoutes.js backend/services/itinerary/persist.js
git commit -m "Add itinerary cover upload endpoint"
```

---

### Task 2: Frontend — cover picker + upload wiring

**Files:**
- Modify: `frontend/src/api/itinerary.js` (add `uploadItineraryCover`)
- Modify: `frontend/src/pages/CreateItineraryPage/ItineraryWizard/ItineraryWizard.jsx` (add `coverImageFile` to `INITIAL_FORM`)
- Modify: `frontend/src/pages/CreateItineraryPage/Step3_Finish/Step3_Finish.jsx` (+ picker)
- Modify: `frontend/src/pages/CreateItineraryPage/Step3_Finish/Step3_Finish.css` (+ picker styles)
- Modify: `frontend/src/pages/LoadingPage/LoadingPage.jsx` (upload after create)

**Interfaces:**
- Consumes: `POST /itineraries/:id/cover` (field name `cover`) from Task 1.
- Produces: `uploadItineraryCover(id, file)` in `api/itinerary.js`; `form.coverImageFile` (a `File` or `null`) in wizard state.

- [ ] **Step 1: Add the API client**

In `frontend/src/api/itinerary.js`, add (mirrors `uploadAvatar` in `api/users.js`):

```js
// Upload a cover image for an itinerary the caller owns. `file` is a File; axios
// sets the multipart Content-Type + boundary automatically. Returns the updated
// itinerary.
export async function uploadItineraryCover(id, file) {
  const formData = new FormData()
  formData.append('cover', file)
  const { data } = await api.post(`/itineraries/${id}/cover`, formData)
  return data
}
```

- [ ] **Step 2: Add `coverImageFile` to the wizard's initial form**

In `frontend/src/pages/CreateItineraryPage/ItineraryWizard/ItineraryWizard.jsx`, add the field to `INITIAL_FORM` so it exists before Step 3:

```js
const INITIAL_FORM = {
  tripDate: '',
  startTime: '',
  endTime: '',
  transport: '',
  travelRadius: '',
  budget: '',
  members: [newMember()],
  isPublic: false,
  title: '',
  description: '',
  coverImageFile: null,
};
```

- [ ] **Step 3: Add the cover picker to Step3_Finish**

In `frontend/src/pages/CreateItineraryPage/Step3_Finish/Step3_Finish.jsx`, import `useState`/`useEffect` and `useRef` from React at the top:

```js
import { useState, useEffect, useRef } from 'react'
```

Inside the component (before `return`), add local preview state driven by the file in `form`:

```js
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  // Build/revoke an object URL for the chosen file so the thumbnail updates live
  // and we don't leak blob URLs.
  useEffect(() => {
    const file = form.coverImageFile;
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.coverImageFile]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    update('coverImageFile', file);
  };

  const handleRemoveImage = () => {
    update('coverImageFile', null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
```

Then add the picker block after the Description field's `</div>` and before `<PrivacyField ... />`:

```jsx
      <div className="step3-finish__field">
        <label>Cover image</label>
        <p className="step3-finish__hint">Optional — leave blank to use a warm default.</p>
        {preview && (
          <div className="step3-finish__cover-preview">
            <img src={preview} alt="Chosen cover preview" />
            <button
              type="button"
              className="step3-finish__cover-remove"
              onClick={handleRemoveImage}
            >
              Remove
            </button>
          </div>
        )}
        <label className="step3-finish__cover-upload">
          {form.coverImageFile ? 'Choose a different image' : 'Upload an image'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            hidden
          />
        </label>
      </div>
```

- [ ] **Step 4: Style the picker**

Append to `frontend/src/pages/CreateItineraryPage/Step3_Finish/Step3_Finish.css`:

```css
.step3-finish__hint {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--slate-500, #6e6656);
}

/* File input styled as a ghost button (the real input is visually hidden). */
.step3-finish__cover-upload {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 10px 16px;
  border: 1px dashed var(--border-strong, #ddcca6);
  border-radius: var(--radius-pill, 999px);
  background: transparent;
  color: var(--accent, #e67e34);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease;
}

.step3-finish__cover-upload:hover {
  border-color: var(--accent, #e67e34);
  color: var(--accent-strong, #cf6a2f);
}

.step3-finish__cover-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.step3-finish__cover-preview img {
  width: 120px;
  height: 68px; /* 16:9-ish thumbnail */
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border, #ece1c8);
}

.step3-finish__cover-remove {
  padding: 6px 12px;
  border: 1px solid var(--border-strong, #ddcca6);
  border-radius: var(--radius-pill, 999px);
  background: transparent;
  color: var(--slate-600, #5c5646);
  font-size: 0.85rem;
  cursor: pointer;
}

.step3-finish__cover-remove:hover {
  border-color: var(--accent, #e67e34);
  color: var(--accent-strong, #cf6a2f);
}
```

- [ ] **Step 5: Upload from LoadingPage after the itinerary is created**

In `frontend/src/pages/LoadingPage/LoadingPage.jsx`, add `uploadItineraryCover` to the import from `../../api/itinerary.js`. Find the success navigate:

```js
        navigate(`/itinerary/${result.itinerary.id}`, { replace: true });
```

Replace with:

```js
        // If the user chose a cover image in the wizard, upload it now that the
        // itinerary exists. Non-fatal: the itinerary is already saved, so on
        // failure we log and continue — the banner falls back to the gradient.
        if (form.coverImageFile) {
          try {
            await uploadItineraryCover(result.itinerary.id, form.coverImageFile);
          } catch (uploadErr) {
            console.error('Cover upload failed (non-fatal):', uploadErr);
          }
        }
        if (!active) return;
        navigate(`/itinerary/${result.itinerary.id}`, { replace: true });
```

(The surrounding effect is already `async` and already reads `form` — confirm `form` is in scope here; at plan time `const form = location.state?.form` is defined at the top of the effect.)

- [ ] **Step 6: Verify lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: lint clean; build succeeds.

- [ ] **Step 7: Commit (only if authorized)**

```bash
git add frontend/src/api/itinerary.js \
        frontend/src/pages/CreateItineraryPage/ItineraryWizard/ItineraryWizard.jsx \
        frontend/src/pages/CreateItineraryPage/Step3_Finish/Step3_Finish.jsx \
        frontend/src/pages/CreateItineraryPage/Step3_Finish/Step3_Finish.css \
        frontend/src/pages/LoadingPage/LoadingPage.jsx
git commit -m "Add cover image picker to itinerary creation"
```

---

### Task 3: Frontend — branded gradient fallback mark

**Files:**
- Modify: `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx`
- Modify: `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.css`

**Interfaces:**
- Consumes: `coverImageUrl` prop already passed to `ItineraryPanel`.
- Produces: a `.itinerary-panel__banner-mark` element shown only when `!coverImageUrl`.

- [ ] **Step 1: Render the mark in the banner (only when no cover)**

In `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx`, inside `.itinerary-panel__banner`, add the mark as the first child of the banner (before the `<img>`), guarded on no cover. Find:

```jsx
        <div className="itinerary-panel__banner">
          {coverImageUrl && (
            <img
              className="itinerary-panel__banner-img"
              src={coverImageUrl}
              alt={`Cover photo for ${title || 'this itinerary'}`}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
```

Insert the mark right after the opening `<div className="itinerary-panel__banner">`:

```jsx
        <div className="itinerary-panel__banner">
          {!coverImageUrl && (
            <span className="itinerary-panel__banner-mark" aria-hidden="true" />
          )}
          {coverImageUrl && (
            <img
              className="itinerary-panel__banner-img"
              src={coverImageUrl}
              alt={`Cover photo for ${title || 'this itinerary'}`}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
```

- [ ] **Step 2: Style the mark (reusing the navbar diamond recipe)**

In `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.css`, add after the `.itinerary-panel__banner-img` rule:

```css
/* Fallback-only brand mark: the NavQuest diamond (same recipe as the navbar
   wordmark) centered low-opacity over the gradient, so a coverless banner reads
   as intentional/branded rather than empty. Sits below the scrim (z-index 1) and
   content (z-index 2). Rendered only when there is no cover image. */
.itinerary-panel__banner-mark {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 0;
  width: 64px;
  height: 64px;
  transform: translate(-50%, -50%) rotate(45deg);
  border-radius: 50% 50% 50% 2px;
  background: #ffffff;
  opacity: 0.18;
}
```

- [ ] **Step 3: Verify lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: lint clean; build succeeds.

- [ ] **Step 4: Commit (only if authorized)**

```bash
git add frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx \
        frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.css
git commit -m "Add branded gradient fallback to itinerary banner"
```

---

## Manual verification (after all tasks)

**Prerequisite:** create a public Supabase Storage bucket `itinerary-covers` (dashboard, same config as `avatars`).

1. `cd backend && npm start` and `cd frontend && npm run dev`.
2. Run the Create wizard to the last step. Confirm the "Cover image" picker appears below Description with the "leave blank to use a warm default" hint.
3. **Upload path:** choose an image → thumbnail preview shows; "Remove" clears it; choose again → finish. On the itinerary page, the banner shows the uploaded image, and the Discover/dashboard card thumbnail shows it too.
4. **Fallback path:** finish with no image → banner shows the sunset→moss gradient with the faint centered diamond mark; title/author stay legible over it. Check a Discover/dashboard card for the same itinerary — if the card renders `coverImageUrl` with its own fallback, confirm it also degrades cleanly (it shows the gradient background from `.itinerary-card`; the diamond mark is panel-only unless the card is separately updated — acceptable, note it).
5. **Rejection paths:** try a non-image file → the request 400s ("Cover must be an image file"). A >5 MB image → the request **500s** (multer's `LIMIT_FILE_SIZE` falls through the global error handler as a 500 — this matches the existing avatar route's behavior, not a bug). In both cases confirm the itinerary still saved (the upload is non-fatal) and the banner shows the fallback.
6. Without the bucket created, confirm an upload attempt is non-fatal: the itinerary still opens with the gradient fallback (check the console for the logged non-fatal error).

## Notes / out of scope

- **Discover/dashboard card fallback:** the card thumbnail reads the same `coverImageUrl`. With it null-by-default, the card shows its existing surface background. Adding the diamond mark to the card too is a small follow-up, not built here (the design scoped the mark to the panel banner).
- **Changing/removing a cover on an existing itinerary** (from ItineraryPage) — the endpoint supports it, but no UI is built now (YAGNI).
- **Image optimization** (WebP/resize/srcset) — not done, matches avatars; 5 MB cap only.
