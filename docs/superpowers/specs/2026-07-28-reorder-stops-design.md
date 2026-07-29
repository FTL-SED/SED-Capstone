# Drag-to-reorder itinerary stops

**Date:** 2026-07-28
**Status:** Approved (design)
**Author:** Semir

## Problem

The itinerary owner can edit a stop's time and its metadata, but cannot change the
*order* of stops. We want the owner to drag ItineraryStop cards into a new sequence on
the Itinerary page, and have the day's timing recomputed from that new order — reusing
the existing `rescheduleStops` scheduler (`backend/services/ai/fallback/schedule.js`)
rather than inventing a second sequencing path.

## Scope

- Owner-only. Non-owners see the timeline exactly as today (no drag handles).
- Reorder recomputes each stop's `startTime`/`endTime` and travel legs; it does NOT
  add, remove, or re-venue stops, and never touches title/description/budget/cover.
- One day, one itinerary at a time.

## Reschedule rule: re-walk the clock only

`rescheduleStops` preserves each stop's dwell (`departTime − arriveTime`), walks the
clock forward from the day's start, and adds travel time between consecutive stops.

For a *manual* reorder we want the dragged order honored **literally**:

- **No meal-window holding.** The scheduler holds a stop until its meal window opens
  *when the stop carries a `mealType`*. To keep a dragged lunch from being pushed later
  (which would leave a confusing gap), the endpoint passes each stop to the scheduler
  with `mealType` **stripped from the scheduling input**. The stored `mealType` is
  preserved on the persisted row for display — it is only omitted from the reschedule
  call so no meal is held.
- **No day-fill.** `options.windowEndElapsed` is not passed, so dwells are never
  stretched. The day ends when the last stop's natural dwell ends.

Net effect: dwell times are preserved, stops appear in exactly the dragged order, and
only travel time is inserted between them.

## Architecture

Data flow (unchanged principle: frontend → backend → Supabase):

```
drag drop (WrittenItinerary)
  → optimistic cache reorder (React Query ['itinerary', id])
  → PUT /itineraries/:id/stops/order { stopIds: [...] }
      → controller: owner gate + validate stopIds
      → load stops (+pins), reorder to match stopIds
      → ISO startTime/endTime → Pacific "HH:MM" (arriveTime/departTime)
      → rescheduleStops(ordered, coordOf, startTime, transport)   // mealType stripped
      → "HH:MM" → ISO (midnight-safe), backfilled travel legs
      → model.reorderStops(): two-phase write in one transaction
  → response: updated itinerary → cache updated
  (on error: invalidate ['itinerary', id] to roll back)
```

### Backend

**Route** — `backend/routes/itineraryRoutes.js`

```
router.put('/:id/stops/order', requireAuth, reorderItineraryStops)
```

Placed with the other `/:id/...` sub-resource routes. Named `reorderItineraryStops` to
avoid colliding with `stopController.updateStop`.

**Controller** — `backend/controllers/itineraryController.js` → `reorderItineraryStops`

1. Parse `:id`; `loadOwned` (same helper `updateItinerary` uses) → 404/403 as usual.
2. Read `{ stopIds }` from body. Validate:
   - `stopIds` is a non-empty array of integers, no duplicates.
   - It is exactly the set of the itinerary's current stop ids (same length, same
     members) → else `400 { error: 'stopIds must list every stop of this itinerary exactly once' }`.
3. Load the itinerary's stops with their pins (via `itineraries.findByIdWithStops` or a
   stops query that includes `pin`). Reorder them to match `stopIds`.
4. Convert each stop's ISO `startTime`/`endTime` → Pacific `arriveTime`/`departTime`
   (`HH:MM`) using a new `fromDateTime` helper (see persist.js below).
5. Determine scheduler inputs:
   - `startTime` = itinerary `dayStart` if set, else the earliest stop's `arriveTime`.
   - `transport` = itinerary `transport` (may be null/undefined → scheduler default).
6. Build the scheduling input: each stop as `{ ...stop, pin, mealType: undefined }` so
   meals are not held. Call
   `rescheduleStops(ordered, (s) => s.pin, startTime, transport)`.
7. Convert the recomputed `arriveTime`/`departTime` back to ISO DateTimes using the
   same midnight-roll logic `persist.js`'s `stopsToStops` uses (a stop whose time is
   earlier than the previous rolls to the next calendar day). Anchor the calendar day
   on the itinerary's `tripDate` if set, else the existing first stop's date.
8. Persist via `model.reorderStops(...)` and respond with the reshaped itinerary
   (`itineraries.findById(id, { forOwner: true })`), matching `updateItinerary`'s 200
   shape.

Errors follow the existing per-controller try/catch convention (`console.error` raw,
return a friendly JSON error). A `P2002` from the write returns
`409 { error: 'Stop order conflict, please retry' }` — though the two-phase write
below is designed to prevent it.

**Model** — `backend/models/itineraryStops.js` → `reorderStops(itineraryId, rows)`

`rows` = `[{ id, orderInItinerary, startTime, endTime, travelTimeToNextMinutes, distanceToNextMeters }]`.

`@@unique([itineraryId, orderInItinerary])` is not deferrable, so a naive one-pass write
that swaps two stops' orders can transiently collide. Two-phase write inside a single
`prisma.$transaction`:

1. **Phase 1** — bump every stop of this itinerary to a guaranteed-free temp order
   (`orderInItinerary = -1 - index`, i.e. negative, which no real row uses).
2. **Phase 2** — write each stop's final `orderInItinerary` + `startTime`/`endTime` +
   travel fields.

Both phases run in one transaction, so the constraint is only ever momentarily
satisfied and the whole reorder is atomic.

**Helper** — `backend/services/itinerary/persist.js` → add `fromDateTime`

Inverse of the existing `toDateTime`: given an ISO DateTime, return its Pacific
wall-clock `HH:MM`. DST-safe via `Intl.DateTimeFormat('en-US', { timeZone:
'America/Los_Angeles', hour12: false, hour: '2-digit', minute: '2-digit' })`. Exported
alongside `toDateTime`/`pacificOffset` so both the controller and tests can use it.

### Frontend

**Dependency** — add `@dnd-kit/core` + `@dnd-kit/sortable` to `frontend/package.json`.
Chosen over native HTML5 DnD for smooth reordering, keyboard accessibility, and touch
support. (Confirmed with the user; overrides the default "no new deps" lean in
`frontend/CLAUDE.md` for this feature.)

**API** — `frontend/src/api/itinerary.js` → `reorderStops(itineraryId, stopIds)`
→ `PUT /itineraries/:itineraryId/stops/order` with body `{ stopIds }`.

**Component** — `frontend/src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.jsx`

- When `editable` (owner), wrap the stop list in `<DndContext><SortableContext>`; each
  stop card uses `useSortable` keyed by its `stopId`. A drag handle appears on the card.
- Non-owner path is unchanged (plain `pins.map`).
- On drag end: compute the new `stopId` order, optimistically write the reordered list
  into the React Query cache (`['itinerary', id]`), and call `reorderStops`. The page's
  existing mutation pattern (see `handleEditStop`) handles success (cache update from the
  response) and failure (invalidate to roll back).
- No new component files — the sortable wrapper and handle live inside
  `WrittenItinerary.jsx`, matching the existing structure. CSS for the drag handle /
  dragging state goes in the existing `WrittenItinerary.css` (or the stop card's CSS),
  using the same theme tokens already in use.

## Testing

Co-located `*.test.js` (Node `node:test`):

- `services/itinerary/persist.test.js` (or new sibling): `fromDateTime` round-trips with
  `toDateTime` and is DST-safe (a PDT date and a PST date).
- Reorder mapping: given stops in a new order, the recomputed times preserve dwell,
  insert travel, keep chronological order, do NOT hold meals (a stop with `mealType`
  dragged early is not pushed), and roll correctly across midnight.
- Confirm the 6 pre-existing baseline test failures (mealBlock utils + DB-integration)
  are unchanged — no new failures introduced.

Frontend: lints + builds clean.

## Out of scope

- Reordering across multiple days (single-day itineraries only today).
- Meal-window holding / day-fill on manual reorder (deliberately off — see reschedule
  rule).
- Any change to stop venue, add/remove, or itinerary metadata.
