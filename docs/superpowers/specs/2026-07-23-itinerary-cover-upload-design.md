# Itinerary cover image upload + gradient fallback

**Date:** 2026-07-23
**Status:** Approved (design), pending implementation plan

## Problem

Two related gaps in the itinerary banner (added earlier this session):

1. **No user control over the image.** The banner shows `itinerary.coverImageUrl`,
   but a user has no way to set it. Today `persist.js` auto-derives it from the
   first stop's venue image (`firstVenue.locationImageUrl`) — and catalog venue
   images are placeholders, so the banner usually shows placeholder art.
2. **Undefined fallback.** When there's genuinely no cover, the intended
   fallback wasn't settled.

Goal: let a user upload their own cover on the **last page of the creation
wizard**, and when they don't, fall back to the warm golden-hour gradient the
banner already renders.

## Decisions (from brainstorming + pro-ui-ux research)

- **Fallback = warm gradient + centered brand mark.** The `sunset → moss`
  diagonal gradient (already built into `.itinerary-panel__banner`) with the
  NavQuest **diamond mark** centered over it at low opacity. Research basis
  (pro-ui-ux): the Empty-States guideline (*"guide users when no content exists;
  don't leave blank space"*) — a bare gradient reads slightly "empty", whereas a
  faint brand mark reads as *intentional*; and the Placeholder-Content guideline
  (*"don't use fake placeholder imagery"*) is why we drop the auto-derived
  venue-photo cover. The mark reuses the exact navbar glyph for consistency:
  a `#e1783c` square, `border-radius: 50% 50% 50% 2px`, `transform: rotate(45deg)`
  (see `Navbar.css` `.navbar--hero .logo::before`) — rendered larger (~64px) and
  low-opacity (~0.18), centered, behind the scrim so the title/author stay legible.
  No broken-image risk (pure CSS/SVG, no network). Content-jumping is already
  handled by the banner's fixed `180px` height.
- **Priority = upload-wins-else-fallback.** Stop auto-deriving the cover from
  placeholder venue images. A cover is set ONLY by an explicit upload; otherwise
  `coverImageUrl` is `null` and the gradient shows.
- **Reuse the existing `coverImageUrl` column** — no new column, no migration
  (the shared Supabase DB must not take avoidable migrations). The column already
  exists on `Itinerary`, is returned in all detail/list responses, is read by the
  ItineraryPage banner AND the Discover/dashboard card thumbnails. An uploaded
  cover therefore appears in both surfaces; a no-upload itinerary shows the
  gradient in both. This is intended and consistent.
- **Scope = creation flow only.** The upload endpoint is built so a future
  "change cover on an existing itinerary" (from ItineraryPage) is a trivial add,
  but that is NOT built now (YAGNI).

## Constraint that shapes the flow

The itinerary **does not exist during the wizard.** Step 3 hands `form` to
`/loading`, which runs recommend → generate → **persist** (the row, and its id,
are created there). So a cover image cannot be attached to an itinerary id until
after creation. The chosen flow:

```
Step 3 (wizard)   user picks a file → held in wizard form state (local preview)
      │ Finish
      ▼
/loading          recommend → generate → itinerary created (gets id)
      │ if a file was picked
      ▼
POST /itineraries/:id/cover   upload to Supabase Storage → set coverImageUrl
      │  (failure is non-fatal — itinerary already exists)
      ▼
navigate /itinerary/:id       banner shows uploaded image, else gradient
```

## Existing pattern to reuse

The user-avatar upload is a complete, working template:
- `routes/userRoutes.js` — `multer.memoryStorage()`, 5 MB cap,
  `upload.single('avatar')`, behind `requireAuth`.
- `controllers/userController.js` `uploadUserAvatar` — owner check
  (`req.user.id !== id → 403`), `image/*` mimetype check, `{id}/avatar.{ext}`
  key with upsert, cache-busting `?v=` suffix, saves URL on the row.
- `lib/supabase.js` `uploadAvatar({ path, buffer, contentType })` — uploads to
  the `avatars` bucket via the service-role admin client, returns the public URL.

The cover upload mirrors this exactly against a new `itinerary-covers` bucket.

## Design

### Backend

**`lib/supabase.js` — generalize the upload helper (DRY).**
Extract the bucket-specific `uploadAvatar` into a shared
`uploadImage({ bucket, path, buffer, contentType })` that does the upsert +
`getPublicUrl`. Keep `uploadAvatar` as a thin wrapper
(`uploadImage({ bucket: 'avatars', ... })`) so `uploadUserAvatar` is unchanged.
Add the `ITINERARY_COVER_BUCKET = 'itinerary-covers'` constant here (env access
stays confined to `lib/`).

**`controllers/itineraryController.js` — `uploadItineraryCover(req, res)`.**
- `id = parseIdParam(...)`; load the itinerary (or a basic ownership row).
- Owner check: `req.user.id !== creatorId → 403`. Not-found → 404.
- `req.file` present and `image/*` → else 400 (same messages as avatar).
- `uploadImage({ bucket: 'itinerary-covers', path: '{id}/cover.{ext}', ... })`,
  cache-bust with `?v={id}-{size}`, then `itineraries.update(id, { coverImageUrl })`.
- Return the updated itinerary (owner shape). 500 on failure with a friendly message.

**`routes/itineraryRoutes.js` — new route.**
`router.post('/:id/cover', requireAuth, upload.single('cover'), uploadItineraryCover)`
with the same `multer` memory-storage + 5 MB config as the avatar route.

**`services/itinerary/persist.js` — default cover to null.**
Remove the first-venue derivation:
```js
// was: const coverImageUrl = firstVenue?.locationImageUrl ?? null
const coverImageUrl = null
```
(Drop the now-unused `byId`/`firstVenue` lines if nothing else uses them.)

**`models/itineraries.js`** — no change; `update` already accepts arbitrary
column data and `coverImageUrl` is an existing column.

### Frontend

**`Step3_Finish.jsx` / `.css` — cover picker.**
Below the Description field, a labeled image picker:
- A styled `<label>`-wrapped `<input type="file" accept="image/*">` (button look).
- On select: store the `File` in `form.coverImageFile` (via `update('coverImageFile', file)`)
  and show a live thumbnail via `URL.createObjectURL(file)`; revoke the object
  URL on replace/unmount to avoid leaks.
- A "Remove" control that clears `coverImageFile` and the preview.
- Copy: "Cover image (optional)" + helper "Leave blank to use a warm default."
- `coverImageFile` is wizard-only state; it must NOT be sent to recommend/generate
  (those take JSON). It rides along in `form` and is consumed in LoadingPage.

**`memberModel.js` / wizard initial state** — ensure the wizard's initial `form`
includes `coverImageFile: null` (wherever the form is initialized), so the field
exists before the user reaches Step 3.

**`api/itinerary.js` — `uploadItineraryCover(id, file)`.**
```js
export async function uploadItineraryCover(id, file) {
  const formData = new FormData()
  formData.append('cover', file)
  const { data } = await api.post(`/itineraries/${id}/cover`, formData)
  return data
}
```
(Mirrors the avatar `uploadAvatar` client; axios sets the multipart boundary.)

**`LoadingPage.jsx` — upload after create.**
After `generateItinerary` returns and before the success navigate:
```js
const created = result.itinerary
if (form.coverImageFile) {
  try {
    await uploadItineraryCover(created.id, form.coverImageFile)
  } catch (err) {
    console.error('Cover upload failed (non-fatal):', err)
    // itinerary already exists; banner falls back to the gradient
  }
}
navigate(`/itinerary/${created.id}`, { replace: true })
```
Upload failure is non-fatal: the itinerary is already persisted; we log and
proceed, and the banner simply shows the gradient.

**Banner (`ItineraryPanel.jsx` / `.css`) — add the centered brand mark.**
The banner already renders `coverImageUrl` when present and the gradient
otherwise, and `onError` hides a broken img. Add a low-opacity NavQuest diamond
mark to the gradient fallback, shown ONLY when there's no cover image:
- Render a `.itinerary-panel__banner-mark` element (CSS diamond via the navbar
  recipe, ~64px, `opacity: ~0.18`, centered, `z-index` below the scrim/content),
  conditional on `!coverImageUrl` so it never sits under an uploaded photo.
- Keep the fixed `180px` height and the scrim so overlaid text stays legible.
With `coverImageUrl` null-by-default, the gradient + mark shows for every
no-upload itinerary (ItineraryPage banner AND Discover/dashboard cards — confirm
the card fallback matches, or scope the mark to the panel if cards differ).

## Prerequisite (shared infra — user action required)

The **`itinerary-covers` Supabase Storage bucket must be created** (public, same
config as the existing `avatars` bucket). This is done in the Supabase dashboard,
not in code, and cannot be created from this repo. Until it exists, uploads will
500 (caught, non-fatal — itinerary still saves, banner falls back). Flag this in
the implementation plan's manual-verification step.

## Testing

- **Backend:** the codebase convention is that routes/controllers/middleware are
  not unit-tested (only pure service/util logic is) — matches how `uploadUserAvatar`
  is untested. So no controller test. If any pure helper is extracted (e.g. an
  extension-from-mimetype helper), unit-test that; otherwise none.
- **`persist.js`** has tests — update any assertion that expects a derived
  `coverImageUrl` to expect `null`.
- **Frontend:** components aren't unit-tested here (node:test can't render JSX);
  verification is `npm run lint` + `npm run build` clean, plus manual drive.
- **Manual:** create the bucket → run the wizard → (a) upload an image, finish,
  confirm the banner + Discover card show it; (b) finish with no image, confirm
  both show the gradient; (c) upload a non-image / >5 MB file, confirm the 400 and
  that the itinerary still saves.

## Out of scope

- Changing/removing a cover on an already-created itinerary (ItineraryPage).
- Image cropping/resizing/optimization (upload as-is, 5 MB cap; matches avatars).
- Any migration or new column (reusing `coverImageUrl`).
