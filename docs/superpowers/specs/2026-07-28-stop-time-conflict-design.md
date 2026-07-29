# Reject stop-time edits that overlap another stop

**Date:** 2026-07-28
**Author:** Semir (with Claude)
**Status:** Approved — ready for implementation plan

## Goal

When the itinerary **owner** edits a stop's scheduled time (start/end) on the Itinerary page,
reject the edit if the new time range **overlaps another stop** in the same itinerary. Surface
the conflict both inline (before any network call) and as an authoritative server rejection.

Builds on the already-shipped edit-stop-time feature
(`docs/superpowers/specs/2026-07-28-edit-stop-time-design.md`): the inline `PinTiming` editor,
`handleEditStop` in `ItineraryPage.jsx`, and `PUT /stops/:id` (`updateStop`) all exist. This
spec only adds a conflict check on top.

## Conflict rule

The edited stop's `[start, end)` range may not overlap any **other** stop's `[start, end)`
range in the same itinerary. Shared boundaries are allowed (one stop ends 15:00, the next
starts 15:00 — fine). A real overlap is rejected.

Standard half-open interval overlap:

```
newStart < other.end && newEnd > other.start
```

Comparison is on the absolute ISO instants (the `startTime`/`endTime` `DateTime` columns), so no
timezone handling is needed for the comparison itself — instants are unambiguous. Same-day-only
scoping is explicitly **not** used; any overlapping instants conflict.

## Enforcement — both layers

### Client-side (inline hint, no wasted request)

- **`WrittenItinerary.jsx`** already has every stop in `pins`. For each rendered stop, pass a new
  `siblings` prop to `PinTiming`: the `{ startTime, endTime }` of every **other** stop (filtered
  out by `stopId`). Non-editable renders don't need it — only pass it (or pass it always; it's
  cheap and unused when not editing).
- **`PinTiming.jsx`** — in `save()`, after the existing "end must be after start" check and using
  the already-reconstructed `newStart`/`newEnd` ISO instants, check overlap against each sibling.
  On overlap: `setError('This time overlaps another stop.')` and return **without** calling
  `onEditStop` — no network request, mirroring the existing inline-hint pattern for the
  end-before-start case. The 3-line overlap test is inlined in `PinTiming` (the frontend has no
  shared util directory for this, and `frontend/CLAUDE.md` forbids adding files).

### Backend (authoritative 409 safety net)

- **`models/itineraryStops.js`** — add a thin wrapper:

  ```js
  function findManyByItinerary(itineraryId) {
    return prisma.itineraryStop.findMany({ where: { itineraryId } })
  }
  ```

  Export it alongside the existing functions. No `select` needed — this is internal data used
  for the overlap comparison, not a response body.

- **`utils/time.js`** — add a pure, tested `rangesOverlap(aStart, aEnd, bStart, bEnd)` helper that
  accepts `Date`/ISO values and returns the half-open overlap boolean. Co-locate tests in
  `utils/time.test.js`.

- **`controllers/stopController.js` → `updateStop`** — when `startTime` **or** `endTime` is present
  in the body (i.e. timing is changing), after building `data` and before `itineraryStops.update`:
  1. Compute the **effective** new range: `data.startTime ?? stop.startTime`,
     `data.endTime ?? stop.endTime` (so editing only one endpoint still checks against the other's
     existing value).
  2. Fetch siblings via `findManyByItinerary(stop.itineraryId)` and exclude the stop being edited
     (`s.id !== id`).
  3. If any sibling's range overlaps the effective new range (`rangesOverlap`), return
     `409 { error: 'That time overlaps another stop in this itinerary.' }`.

  This sits alongside the existing `P2002` order-collision 409. The frontend's `handleEditStop`
  already surfaces `err.response?.data?.error` via `window.alert` and reverts the optimistic
  patch, so **no frontend wiring change** is needed for the server path.

## Data flow

```
PinTiming.save()
  → reconstruct newStart/newEnd (existing)
  → end-before-start check (existing)
  → overlap vs siblings (NEW, inline) ── overlap ─→ inline hint, stop
  → onEditStop(stopId, { startTime, endTime })
      → handleEditStop: optimistic patch + PUT /stops/:id
          → updateStop: validate → overlap vs siblings (NEW) ── overlap ─→ 409
          → itineraryStops.update
      → on 409/failure: revert + alert(server message)
```

## Error handling

- Client overlap → inline hint, no request, editor stays open (same as end-before-start).
- Server overlap → `409` with a friendly message; `handleEditStop` reverts the optimistic update
  and alerts. The two messages are worded slightly differently (client "This time overlaps
  another stop."; server "That time overlaps another stop in this itinerary.") — acceptable; the
  server message is the fallback path users rarely hit.

## Testing / verification

- **Backend:** unit tests for `rangesOverlap` in `utils/time.test.js` — overlapping ranges,
  touching boundaries (no overlap), fully disjoint, one range containing another, editing a
  single endpoint. Existing suite stays green (`cd backend && npm test`).
- **Frontend:** `cd frontend && npm run lint && npm run build` clean.
- **Manual:** as owner, edit a stop to overlap a neighbor → inline hint, no save. Edit to a
  free slot → saves and persists. Boundary-touching (end == next start) → allowed.

## Out of scope

- Auto-resolving conflicts (shifting neighbors, reordering) — this feature only **rejects**.
- Editing `orderInItinerary`/`mealType`/`note` conflict semantics — unchanged.
- Multi-day scoping of conflicts — any overlapping instants conflict regardless of calendar day.
