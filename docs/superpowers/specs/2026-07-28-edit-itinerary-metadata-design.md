# Owner inline-edit of itinerary title / description / budget / cover

**Date:** 2026-07-28
**Author:** Semir (with Claude)
**Status:** Approved — ready for implementation plan

## Goal

Let the itinerary **owner** edit the itinerary's own metadata — **title**, **description**,
**per-person budget**, and **cover image** — from the Itinerary detail page. A single
owner-only **Edit** toggle flips the panel into edit mode; one **Save** / **Cancel** commits
all four fields as a batch.

This complements the already-shipped stop-time editing. Here we edit the *itinerary's* fields,
not the stops.

## Scope

- **Backend:** one small gap — add `maxBudgetPerPerson` to the fields `PUT /itineraries/:id`
  accepts. Everything else (title/description/coverImageUrl update, cover upload) already exists.
- **Frontend:** the real work — an Edit toggle + inline field editing on `ItineraryPanel`.

No schema change: `maxBudgetPerPerson` already exists on the `Itinerary` model.

## Authorization

Owner-only, consistent with the rest of the page. The Edit affordance renders only when
`isOwner` is true ([ItineraryPage.jsx](../../frontend/src/pages/ItineraryPage/ItineraryPage.jsx)
computes it). Both backend endpoints are already owner-gated via `loadOwned`.

## Backend

### `PUT /itineraries/:id` — add budget

`updateItinerary` ([itineraryController.js:195](../../backend/controllers/itineraryController.js#L195))
currently accepts `title`, `location`, `description`, `coverImageUrl`, `isPublic` — but **not**
`maxBudgetPerPerson`. Add it, mirroring the existing per-field validation:

```js
if (maxBudgetPerPerson !== undefined) {
  if (
    maxBudgetPerPerson !== null &&
    (typeof maxBudgetPerPerson !== 'number' ||
      !Number.isFinite(maxBudgetPerPerson) ||
      maxBudgetPerPerson < 0)
  ) {
    return res.status(400).json({ error: 'maxBudgetPerPerson must be a non-negative number or null' })
  }
  data.maxBudgetPerPerson = maxBudgetPerPerson
}
```

(`null` clears the budget; a non-negative number sets it.) No other backend change.

### Cover upload — already exists

`POST /itineraries/:id/cover`
([itineraryController.js:405](../../backend/controllers/itineraryController.js#L405)) accepts a
multipart image, stores it in Supabase Storage, persists the URL, and returns the updated
itinerary. Reused as-is.

## Frontend

Per `frontend/CLAUDE.md`, do **not** add component files not required — extend the existing
components (`Title`, `Description`, the budget line + cover banner in `ItineraryPanel`), the
same way `PinTiming` was extended for stop-time editing.

### API client — `frontend/src/api/itinerary.js`

Both functions already exist and are reused:
- `updateItinerary(id, changes)` — `PUT /itineraries/:id` (now also carries `maxBudgetPerPerson`).
- `uploadItineraryCover(id, file)` — `POST /itineraries/:id/cover` (multipart).

No new API function needed.

### Edit state — owned by `ItineraryPanel`

`ItineraryPanel` gains:
- `editing` boolean state (starts false).
- Draft state seeded from props on entering edit mode: `draftTitle`, `draftDescription`,
  `draftBudget` (string for the number input), and `coverFile` (a staged `File` or null) +
  `coverPreview` (a `URL.createObjectURL` preview, or the existing `coverImageUrl`).
- An owner-only **Edit** button (in `ActionBar`, alongside Delete/Copy) that sets `editing = true`
  and seeds the drafts.
- **Save** and **Cancel** buttons shown while editing. Cancel discards drafts + revokes any
  object URL. Save calls up to `ItineraryPage`.

> **No new files:** the existing ActionBar controls are each their own component file, but per
> `frontend/CLAUDE.md` (no components not required by the spec), the Edit / Save / Cancel controls
> are rendered as **plain inline `<button>`s** — passed into `ActionBar` as props/children from
> `ItineraryPanel` — rather than new `EditButton.jsx`-style files.

### Field rendering (edit mode)

- **`Title`** — renders an `<input type="text">` bound to `draftTitle` when `editing`, else the
  `<h1>` text. (Same conditional shape as `PinTiming`.)
- **`Description`** — renders a `<textarea>` bound to `draftDescription` when `editing`, else the
  `<p>`.
- **Budget** — the budget line is inline JSX in `ItineraryPanel`; when `editing`, render a
  `<input type="number" min="0">` bound to `draftBudget`. Blank ⇒ send `null` (clears budget).
- **Cover** — when `editing`, overlay a **"Change cover"** button on the banner (reusing the
  hidden-file-input pattern from
  [AvatarUploadButton](../../frontend/src/pages/AccountPage/AccountAvatar/AvatarUploadButton/AvatarUploadButton.jsx)).
  Selecting a file stages it in `coverFile` and shows a local `URL.createObjectURL` preview in
  the banner. No immediate upload — it commits on Save.

### Save flow — `ItineraryPage.handleEditItinerary(changes, coverFile)`

Coordinated, NOT optimistic (a file upload is async and can fail; show a busy state, exit edit
mode only on success). Guarded by the existing `actionBusy` flag so a double-click can't fire
twice.

1. If `coverFile` is set: `await uploadItineraryCover(id, coverFile)` first → returns updated
   itinerary (with the new `coverImageUrl`).
2. `await updateItinerary(id, { title, description, maxBudgetPerPerson })`.
3. Merge both results into `itinerary` state; exit edit mode.
4. On failure: keep edit mode open, `window.alert(err.response?.data?.error || <fallback>)`,
   leave drafts intact so the user can retry. Revoke the object URL.

Only send changed text fields (skip `undefined`) so an unchanged field isn't needlessly written.

### Validation

- **Client:** title must be non-empty (trim); budget must be ≥ 0 or blank. Block Save + show an
  inline hint otherwise.
- **Backend:** enforces the same (non-empty title, non-negative budget) and owns the source of
  truth.

## Testing / verification

- Backend: `cd backend && npm test` — add/confirm coverage for the new `maxBudgetPerPerson`
  branch in `updateItinerary` validation if the controller has unit coverage; otherwise the
  existing suite must stay green (same pre-existing failures as before, no new ones).
- Frontend: `cd frontend && npm run build` clean. (Lint has a pre-existing Navbar error unrelated
  to this work.)
- Manual (owner): click Edit → change all four fields incl. a new cover → Save → values persist
  across refresh; Cancel discards; non-owner/logged-out sees no Edit affordance and `PUT` / cover
  `POST` return 403.

## Out of scope

- Editing `location`, `tripDate`, `dayStart`/`dayEnd`, `travelRadius`, `transport`, or group
  members — not requested. (`location` is already PUT-supported but not surfaced here.)
- Reordering/adding/removing stops or editing stop times — separate, already shipped.
- Image cropping/resizing — the cover picker sends the file as-is, like the avatar flow.
