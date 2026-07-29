# Edit stop times on the Itinerary page (+ `/pins` → `/stops` rename)

**Date:** 2026-07-28
**Author:** Semir (with Claude)
**Status:** Approved — ready for implementation plan

## Goal

Let the itinerary **owner** edit a stop's scheduled **time** (start/end) directly on the
Itinerary page — without touching the venue's information (name, address, price, etc.).

While we're here, rename the misleadingly-named `/pins` HTTP resource to `/stops`, because
its `:id` operations all act on **ItineraryStops**, not **Pins**.

## Domain distinction (why the rename matters)

- **`Pin`** = a venue/place — shared catalog data (name, address, coords, price, tags).
- **`ItineraryStop`** = that place *as scheduled in one itinerary* — carries `startTime`,
  `endTime`, `orderInItinerary`, `mealType`, `note`, travel fields.

The time being edited lives entirely on the **ItineraryStop**. The existing
`PUT /pins/:id` handler already resolves `:id` as an ItineraryStop id
(`itineraryStops.findByIdWithItinerary`) and only writes stop timing fields — it structurally
cannot modify the `Pin`. So "edit the time, not the info" is already guaranteed server-side.

**Authorization:** owner-only. The existing controller check
(`stop.itinerary.userId !== req.user.id → 403`) is exactly what we want and stays as-is.
`ItineraryMember` rows are captured preferences and are not linked to user accounts, so there
is no non-owner edit path — and none is being added.

## Scope

- **Backend:** no behavioral change. Only a resource **rename** (`/pins` → `/stops`) for clarity.
- **Frontend:** add the edit UI + one API function. This is where the real work is.

The `Pin` model, `Pin` table, `schema.prisma`, and `models/pins.js` are **unchanged** — a Pin
*is* a venue, so that name is correct. Only the HTTP resource is renamed.

## Part A — Rename `/pins` → `/stops`

Full blast radius (verified; contained):

1. **`backend/index.js`** — `app.use('/pins', pinRoutes)` → `app.use('/stops', stopRoutes)`.
2. **Rename `backend/routes/pinRoutes.js` → `backend/routes/stopRoutes.js`** and update its
   import of the controller. Update the import in `index.js`.
3. **Rename `backend/controllers/pinController.js` → `backend/controllers/stopController.js`.**
   De-`Pin` the exported handler names:
   - `browsePins` → `searchCatalog`  (`GET /stops` — catalog browse; note: returns venues;
     matches the frontend caller name in `api/itinerary.js`)
   - `getPin` → `getStop`            (`GET /stops/:id`)
   - `createPin` → `createStop`      (`POST /stops`)
   - `updatePin` → `updateStop`      (`PUT /stops/:id`)
   - `deletePin` → `deleteStop`      (`DELETE /stops/:id`)

   Update the leading `// GET /pins` … route comments to `/stops`.
4. **`frontend/src/api/itinerary.js`** — update the 3 existing paths and their comments:
   - `GET /pins`    → `GET /stops`    (in `searchCatalog`)
   - `POST /pins`   → `POST /stops`   (in `addStop`)
   - `DELETE /pins/:stopId` → `DELETE /stops/:stopId` (in `deleteStop`)
5. **Doc comments** mentioning `/pins` in `backend/models/itineraries.js` and
   `backend/controllers/itineraryController.js` — update to `/stops`.

**Known looseness (accepted):** `GET /stops` browses the venue catalog and returns venues, so
the resource name is slightly inaccurate for that one verb. Accepted in exchange for a single,
clean resource rather than a split. `models/pins.js` keeps its name (it wraps the `Pin` table).

**Tests:** no backend `*.test.js` exercises these HTTP routes directly (they test models and
services), so the rename does not break the suite. Re-run `npm test` to confirm.

## Part B — Edit stop time (frontend)

### B1. API client — `frontend/src/api/itinerary.js`

Add, mirroring `addStop`/`deleteStop`:

```js
// PUT /stops/:stopId — update a stop's timing (owner only). Targets the
// ItineraryStop, never the Pin/venue. Returns the updated stop.
export async function updateStop(stopId, body) {
  const { data } = await api.put(`/stops/${stopId}`, body)
  return data
}
```

### B2. Edit UI — extend `PinTiming` (no new files)

`frontend/CLAUDE.md` forbids adding files not required by the spec, so the editor lives inside
the existing `PinTiming` component.

- Non-editable (default): render `HH:MM - HH:MM` exactly as today.
- Editable: show a pencil icon; clicking swaps the text for two `<input type="time">`
  (start, end) plus save/cancel — the same inline-confirm shape as `RemoveStopControl`.
- On save: validate end > start (else keep editing, show an inline hint; no network call).
  Call `onEditStop(stopId, { startTime, endTime })`; collapse back to display on success.

`PinTiming` receives the raw ISO `startTime`/`endTime` (not just the formatted strings) when
editable, so it can seed the inputs and reconstruct the new ISO instants.

### B3. Time conversion

Stops are stored as ISO instants but shown in `America/Los_Angeles` wall-clock. The `<input
type="time">` yields `HH:MM`. To produce the new ISO instant we must recombine that `HH:MM`
with the stop's **existing LA calendar date**, so editing the hour never shifts the day/date.

Add a small local helper next to `formatTime` (in `WrittenItinerary.jsx` or `PinTiming`,
wherever the conversion is owned) that:
1. Reads the stop's existing start ISO, extracts its LA year/month/day.
2. Combines that date with the edited `HH:MM` to build the new ISO instant (respecting the LA
   offset, matching how `formatTime` already uses `timeZone: 'America/Los_Angeles'`).

### B4. Wiring (optimistic update + revert)

Thread `editable` + `onEditStop` through the same path the remove control already uses:

- `WrittenItinerary` → passes `editable` and `onEditStop` to `PinTiming`.
- `ItineraryPanel` → forwards `onEditStop` (alongside `onRemoveStop`/`onAddStop`).
- `ItineraryPage` → `handleEditStop(stopId, { startTime, endTime })` mirrors
  `handleRemoveStop`/`handleTogglePrivacy`:
  1. Optimistically patch the matching `pin` (by `pin.stopId`) in `itinerary.pins`.
  2. `await updateStop(stopId, { startTime, endTime })`.
  3. On failure: revert to the previous `pins` and `window.alert(...)`.

Target `pin.stopId` (the ItineraryStop id) — never `pin.id` (the Pin id) — exactly as
`handleRemoveStop` does.

## Validation

- **Client:** end must be after start (inline hint, no request otherwise).
- **Backend:** already validates start/end are parseable dates; returns 409 on order
  collisions (not reachable here — order is unchanged by this feature).

## Testing / verification

- Backend: `cd backend && npm test` stays green after the rename.
- Frontend: `cd frontend && npm run lint && npm run build` clean.
- Manual: as owner, edit a stop's time inline → persists across refresh; as a non-owner
  viewer, no edit affordance appears and `PUT /stops/:id` returns 403.

## Out of scope

- Editing venue/place info (name, address, etc.) — explicitly excluded.
- Non-owner / group-member editing (would need `ItineraryMember`↔`User` linkage + auth rework).
- Reordering stops or editing `mealType`/`note` (endpoint supports order/meal/note, but this
  feature only surfaces start/end time).
