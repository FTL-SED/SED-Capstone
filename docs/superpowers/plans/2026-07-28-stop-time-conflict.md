# Stop-Time Conflict Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject an owner's stop-time edit when the new start/end range overlaps another stop in the same itinerary, enforced both inline in the frontend editor and as an authoritative backend `409`.

**Architecture:** A pure `rangesOverlap` helper (half-open interval test) lives in `backend/utils/time.js` and is unit-tested. `updateStop` fetches sibling stops via a new `itineraryStops.findManyByItinerary` model wrapper and returns `409` on overlap. The frontend `PinTiming` editor inlines the same 3-line overlap test against a new `siblings` prop passed down from `WrittenItinerary`, blocking the request with an inline hint before it fires.

**Tech Stack:** Node ESM, Express 5, Prisma 6, `node:test` (backend); React 19, Vite (frontend).

## Global Constraints

- Backend is ESM (`"type": "module"`): `import`/`export`, `.js` extensions required in import paths.
- Backend layering: route → controller → model → Prisma. Controllers own `req`/`res`; models are thin Prisma wrappers with no business logic; pure helpers go in `utils/` with co-located `*.test.js`.
- Test runner is `node --test` (`cd backend && npm test`). No jest/vitest.
- Overlap rule (half-open, boundaries allowed): `aStart < bEnd && aEnd > bStart`. Compared on absolute ISO instants — no timezone handling in the comparison.
- Frontend: do NOT create, rename, move, or delete files (`frontend/CLAUDE.md`). The overlap test is inlined in the existing `PinTiming.jsx`; no new frontend files.
- Do NOT run `git commit` automatically — the user makes all commits. Steps below show the commit command for the user to run; the agent stages/leaves changes but does not commit unless the user asks.

---

### Task 1: `rangesOverlap` pure helper (backend)

**Files:**
- Modify: `backend/utils/time.js`
- Test: `backend/utils/time.test.js`

**Interfaces:**
- Produces: `rangesOverlap(aStart, aEnd, bStart, bEnd) → boolean`. Accepts `Date` objects or ISO strings (anything `new Date(x)` parses). Returns `true` when the half-open ranges `[aStart, aEnd)` and `[bStart, bEnd)` overlap; touching boundaries return `false`.

- [ ] **Step 1: Write the failing tests**

Append to `backend/utils/time.test.js` (and add `rangesOverlap` to the existing import from `./time.js`):

```js
test('rangesOverlap: overlapping ranges overlap', () => {
  // 10:00–12:00 vs 11:00–13:00
  assert.equal(
    rangesOverlap('2026-07-28T10:00:00Z', '2026-07-28T12:00:00Z', '2026-07-28T11:00:00Z', '2026-07-28T13:00:00Z'),
    true,
  )
})

test('rangesOverlap: touching boundaries do not overlap', () => {
  // a ends exactly when b starts
  assert.equal(
    rangesOverlap('2026-07-28T10:00:00Z', '2026-07-28T12:00:00Z', '2026-07-28T12:00:00Z', '2026-07-28T13:00:00Z'),
    false,
  )
})

test('rangesOverlap: fully disjoint ranges do not overlap', () => {
  assert.equal(
    rangesOverlap('2026-07-28T10:00:00Z', '2026-07-28T11:00:00Z', '2026-07-28T14:00:00Z', '2026-07-28T15:00:00Z'),
    false,
  )
})

test('rangesOverlap: one range fully containing another overlaps', () => {
  // b is entirely inside a
  assert.equal(
    rangesOverlap('2026-07-28T09:00:00Z', '2026-07-28T18:00:00Z', '2026-07-28T12:00:00Z', '2026-07-28T13:00:00Z'),
    true,
  )
})

test('rangesOverlap: accepts Date objects as well as ISO strings', () => {
  assert.equal(
    rangesOverlap(new Date('2026-07-28T10:00:00Z'), new Date('2026-07-28T12:00:00Z'), new Date('2026-07-28T11:00:00Z'), new Date('2026-07-28T13:00:00Z')),
    true,
  )
})
```

Update the import line at the top of the test file to:

```js
import { toMinutes, toHHMM, windowLengthMinutes, minutesFromStart, rangesOverlap } from './time.js'
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test`
Expected: FAIL — `rangesOverlap is not a function` (the new tests error; existing tests still pass).

- [ ] **Step 3: Implement the helper**

In `backend/utils/time.js`, add before the `export` line:

```js
// Do the half-open instant ranges [aStart, aEnd) and [bStart, bEnd) overlap?
// Accepts Date objects or ISO strings. Touching boundaries (aEnd === bStart)
// do NOT overlap — one stop may end exactly when the next begins. Used to
// reject a stop-time edit that would collide with another stop's schedule.
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const a0 = new Date(aStart).getTime()
  const a1 = new Date(aEnd).getTime()
  const b0 = new Date(bStart).getTime()
  const b1 = new Date(bEnd).getTime()
  return a0 < b1 && a1 > b0
}
```

Update the export line to include it:

```js
export { toMinutes, toHHMM, windowLengthMinutes, minutesFromStart, MINUTES_PER_DAY, rangesOverlap }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS — all `rangesOverlap` tests green, existing suite still green.

- [ ] **Step 5: Commit (user runs this)**

```bash
git add backend/utils/time.js backend/utils/time.test.js
git commit -m "feat(backend): add rangesOverlap time-interval helper"
```

---

### Task 2: `findManyByItinerary` model wrapper (backend)

**Files:**
- Modify: `backend/models/itineraryStops.js`

**Interfaces:**
- Consumes: the `prisma` singleton already imported in the file.
- Produces: `findManyByItinerary(itineraryId) → Promise<ItineraryStop[]>` — every stop row for the itinerary (all columns; no `select`, since it feeds an internal overlap comparison, not a response body).

- [ ] **Step 1: Add the wrapper**

In `backend/models/itineraryStops.js`, add after `findByIdWithItinerary`:

```js
function findManyByItinerary(itineraryId) {
  return prisma.itineraryStop.findMany({ where: { itineraryId } })
}
```

Update the export line at the bottom:

```js
export { create, findByIdWithItinerary, findManyByItinerary, update, remove }
```

- [ ] **Step 2: Verify it loads**

Run: `cd backend && node -e "import('./models/itineraryStops.js').then(m => { if (typeof m.findManyByItinerary !== 'function') throw new Error('missing export'); console.log('ok') })"`
Expected: prints `ok`.

- [ ] **Step 3: Commit (user runs this)**

```bash
git add backend/models/itineraryStops.js
git commit -m "feat(backend): add findManyByItinerary stop model wrapper"
```

_No unit test: this is a thin Prisma pass-through (per backend conventions, models aren't unit-tested in isolation). Its behavior is exercised through Task 3's controller path and manual verification._

---

### Task 3: `updateStop` returns 409 on overlap (backend)

**Files:**
- Modify: `backend/controllers/stopController.js`

**Interfaces:**
- Consumes: `rangesOverlap` (Task 1) from `../utils/time.js`; `findManyByItinerary` (Task 2) from `../models/itineraryStops.js` (already imported as `itineraryStops`).
- Produces: `PUT /stops/:id` responds `409 { error: 'That time overlaps another stop in this itinerary.' }` when the effective new time range overlaps another stop.

- [ ] **Step 1: Add the import**

At the top of `backend/controllers/stopController.js`, add to the existing imports:

```js
import { rangesOverlap } from '../utils/time.js'
```

(`itineraryStops` is already imported; no change there.)

- [ ] **Step 2: Add the overlap check in `updateStop`**

In `updateStop`, after the block that builds `data` (the last field is `note`) and immediately **before** the `try { const updated = await itineraryStops.update(id, data) ... }` block, insert:

```js
  // Reject a timing edit that would overlap another stop in this itinerary.
  // Only relevant when start/end is actually changing. Compare the EFFECTIVE
  // new range (submitted value, else the stop's existing value) against every
  // other stop on the same itinerary. Boundaries may touch (see rangesOverlap).
  if (data.startTime !== undefined || data.endTime !== undefined) {
    const newStart = data.startTime ?? stop.startTime
    const newEnd = data.endTime ?? stop.endTime
    const siblings = await itineraryStops.findManyByItinerary(stop.itineraryId)
    const conflict = siblings.some(
      (s) => s.id !== id && rangesOverlap(newStart, newEnd, s.startTime, s.endTime),
    )
    if (conflict) {
      return res.status(409).json({ error: 'That time overlaps another stop in this itinerary.' })
    }
  }
```

- [ ] **Step 3: Verify the controller module still loads**

Run: `cd backend && node -e "import('./controllers/stopController.js').then(() => console.log('ok'))"`
Expected: prints `ok`.

- [ ] **Step 4: Run the full backend suite**

Run: `cd backend && npm test`
Expected: PASS — no regressions (no existing test hits this HTTP route; the rename spec confirmed routes aren't tested directly).

- [ ] **Step 5: Commit (user runs this)**

```bash
git add backend/controllers/stopController.js
git commit -m "feat(backend): reject overlapping stop-time edits with 409"
```

---

### Task 4: Pass `siblings` down + inline overlap check (frontend)

**Files:**
- Modify: `frontend/src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.jsx`
- Modify: `frontend/src/pages/ItineraryPage/PinTiming/PinTiming.jsx`

**Interfaces:**
- Consumes: `pins` (each with `stopId`, `startTime`, `endTime`) already in `WrittenItinerary`.
- Produces: `PinTiming` accepts a `siblings` prop — an array of `{ startTime, endTime }` for every *other* stop — and blocks `save()` with an inline hint on overlap before calling `onEditStop`.

- [ ] **Step 1: Pass `siblings` from `WrittenItinerary` to `PinTiming`**

In `frontend/src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.jsx`, in the `<PinTiming ... />` render (currently around lines 84–90), add a `siblings` prop built from every other stop. Replace the existing `<PinTiming>` element with:

```jsx
                <PinTiming
                  startTime={pin.startTime}
                  endTime={pin.endTime}
                  editable={editable}
                  stopId={pin.stopId}
                  onEditStop={onEditStop}
                  siblings={pins
                    .filter((p) => p.stopId !== pin.stopId)
                    .map((p) => ({ startTime: p.startTime, endTime: p.endTime }))}
                />
```

- [ ] **Step 2: Consume `siblings` and check overlap in `PinTiming`**

In `frontend/src/pages/ItineraryPage/PinTiming/PinTiming.jsx`:

a) Add the prop to the signature (default `[]` so non-editable/legacy callers are safe):

```jsx
function PinTiming({ startTime, endTime, editable = false, stopId, onEditStop, siblings = [] }) {
```

b) In `save()`, after the existing end-before-start check and before `setEditing(false)`, add the overlap check:

```jsx
    const overlaps = siblings.some((s) => {
      // Half-open overlap on absolute instants: touching boundaries are OK.
      const a0 = new Date(newStart).getTime();
      const a1 = new Date(newEnd).getTime();
      const b0 = new Date(s.startTime).getTime();
      const b1 = new Date(s.endTime).getTime();
      return a0 < b1 && a1 > b0;
    });
    if (overlaps) {
      setError('This time overlaps another stop.');
      return;
    }
```

For reference, `save()` becomes:

```jsx
  const save = () => {
    if (!start || !end) {
      setError('Both times are required.');
      return;
    }
    const newStart = laWallClockToISO(startTime, start);
    const newEnd = laWallClockToISO(endTime, end);
    if (new Date(newEnd) <= new Date(newStart)) {
      setError('End time must be after start time.');
      return;
    }
    const overlaps = siblings.some((s) => {
      // Half-open overlap on absolute instants: touching boundaries are OK.
      const a0 = new Date(newStart).getTime();
      const a1 = new Date(newEnd).getTime();
      const b0 = new Date(s.startTime).getTime();
      const b1 = new Date(s.endTime).getTime();
      return a0 < b1 && a1 > b0;
    });
    if (overlaps) {
      setError('This time overlaps another stop.');
      return;
    }
    setEditing(false);
    onEditStop(stopId, { startTime: newStart, endTime: newEnd });
  };
```

- [ ] **Step 3: Lint and build**

Run: `cd frontend && npm run lint && npm run build`
Expected: lint clean, build succeeds.

- [ ] **Step 4: Commit (user runs this)**

```bash
git add frontend/src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.jsx frontend/src/pages/ItineraryPage/PinTiming/PinTiming.jsx
git commit -m "feat(frontend): block overlapping stop-time edits with inline hint"
```

---

### Task 5: Manual verification

**Files:** none (verification only).

- [ ] **Step 1: Backend suite green**

Run: `cd backend && npm test`
Expected: full suite passes.

- [ ] **Step 2: Frontend clean**

Run: `cd frontend && npm run lint && npm run build`
Expected: no lint errors, build succeeds.

- [ ] **Step 3: Manual end-to-end (owner)**

With backend + frontend dev servers running, open an itinerary you own with ≥2 stops:
- Edit a stop's time so it overlaps a neighbor → inline hint "This time overlaps another stop.", editor stays open, no network request (check devtools Network tab — no `PUT /stops/:id`).
- Edit a stop to a free slot → saves, timeline updates, persists across refresh.
- Edit so the end exactly equals the next stop's start (touching boundary) → allowed, saves.
- (Optional, to exercise the backend path) temporarily bypass the client check and confirm `PUT /stops/:id` returns `409` with the server message and the UI reverts + alerts.

---

## Notes for the implementer

- The two overlap tests (backend `rangesOverlap`, frontend inline) are intentionally duplicated 3-line logic — the frontend cannot import from the backend, and `frontend/CLAUDE.md` forbids adding a shared util file. Keep both in sync if the rule ever changes.
- `handleEditStop` in `ItineraryPage.jsx` already surfaces `err.response?.data?.error` via `window.alert` and reverts the optimistic patch, so the backend `409` needs no additional frontend wiring.
