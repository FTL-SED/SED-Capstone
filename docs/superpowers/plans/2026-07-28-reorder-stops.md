# Drag-to-reorder itinerary stops — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an itinerary owner drag ItineraryStop cards into a new order on the Itinerary page and have the day's timing recomputed from that order via the existing `rescheduleStops` scheduler.

**Architecture:** Drag is owner-only and lives inside the existing `WrittenItinerary.jsx` (dnd-kit sortable, no new component files). On drop the frontend optimistically reorders the React Query cache and calls a new `PUT /itineraries/:id/stops/order` endpoint with the new stop-id order. The backend converts each stop's ISO time to Pacific `HH:MM`, runs `rescheduleStops` (with `mealType` stripped from the scheduling input so meals aren't held and the dragged order is honored literally), converts back to ISO, and persists all stops' order + times + travel legs in one two-phase transaction.

**Tech Stack:** Backend — Express 5, Prisma 6, Node `node:test`. Frontend — React 19, `@tanstack/react-query`, `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (new).

## Global Constraints

- **Commits are the user's.** NEVER run `git commit`. At each "commit" step, stage the listed files with `git add` and PAUSE for the user to commit.
- **Never run destructive Prisma commands** (`migrate reset`, `db push --force-reset`). This feature adds NO migration — the schema is unchanged.
- Backend is ESM (`import`/`export`, `.js` extensions in import paths). `process.env` is read only in `lib/`.
- Backend layering: route → controller → model → Prisma; `services/` owns multi-step domain logic; `utils/` are pure helpers. Controllers are the only layer that touches `req`/`res`.
- Frontend talks ONLY to the backend over HTTP (no Supabase client/secrets).
- `frontend/CLAUDE.md`: do NOT create/rename/move/delete files or add components unless a task explicitly requires it. This plan adds NO new frontend files — the sortable item is defined inside `WrittenItinerary.jsx` (like the existing `RemoveStopControl`).
- Reschedule rule: **re-walk the clock only** — preserve dwell, recompute times + travel from the new order, NO meal-window holding, NO day-fill.
- Times: DB stores ISO instants; the UI/scheduler work in `America/Los_Angeles` wall-clock. Conversions must be DST-safe (reuse `persist.js`'s Intl-based offset approach).
- Known baseline: 6 pre-existing backend test failures (mealBlock utils + DB-integration). Tasks must not increase this count.

---

### Task 1: Pacific time helpers (`fromDateTime`, `pacificDayISO`)

Add the ISO→Pacific-`HH:MM` inverse of the existing `toDateTime`, plus a Pacific calendar-day extractor. Both live next to the existing time helpers in `persist.js` so the reorder service can convert a stored stop back into the scheduler's `HH:MM` domain.

**Files:**
- Modify: `backend/services/itinerary/persist.js`
- Test: `backend/services/itinerary/persist.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `fromDateTime(date: Date | string) => 'HH:MM'` — the Pacific wall-clock hour:minute of an instant, DST-safe.
  - `pacificDayISO(date: Date | string) => 'YYYY-MM-DD'` — the Pacific calendar day of an instant, DST-safe.

- [ ] **Step 1: Write the failing tests**

Add to `backend/services/itinerary/persist.test.js` (import line already imports from `./persist.js` — extend it to include the two new names):

```js
import { stopsToStops, toDateTime, fromDateTime, pacificDayISO, pacificOffset, memberRows, constraintColumns } from './persist.js'

test('fromDateTime returns Pacific HH:MM and round-trips with toDateTime (PDT)', () => {
  // 09:00 PDT === 16:00 UTC
  const dt = toDateTime('2026-07-15', '09:00', '-07:00')
  assert.equal(fromDateTime(dt), '09:00')
})

test('fromDateTime is DST-safe (PST winter instant)', () => {
  // 22:30 PST === 06:30 UTC next day
  const dt = new Date('2026-01-16T06:30:00.000Z')
  assert.equal(fromDateTime(dt), '22:30')
})

test('pacificDayISO returns the Pacific calendar day (late-evening PST instant stays same local day)', () => {
  // 2026-01-15 23:30 PST === 2026-01-16 07:30 UTC — Pacific day is still the 15th
  const dt = new Date('2026-01-16T07:30:00.000Z')
  assert.equal(pacificDayISO(dt), '2026-01-15')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && node --test services/itinerary/persist.test.js`
Expected: FAIL — `fromDateTime is not a function` / `pacificDayISO is not a function`.

- [ ] **Step 3: Implement the helpers**

In `backend/services/itinerary/persist.js`, add after `toDateTime` (around line 40):

```js
// Inverse of toDateTime: the Pacific wall-clock "HH:MM" of an instant, DST-safe
// (same interpretation seed.js / pinsRepository.js store times in). Used by the
// reorder service to hand stored stops back to the HH:MM scheduler.
function fromDateTime(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(date))
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00'
  // Intl can render midnight as "24"; normalize to "00" for a valid HH:MM.
  return `${hh === '24' ? '00' : hh}:${mm}`
}

// The Pacific calendar day (YYYY-MM-DD) of an instant, DST-safe. Used to anchor
// a reordered itinerary on its original day when it has no explicit tripDate.
function pacificDayISO(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(date))
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  return `${y}-${m}-${d}`
}
```

Add both to the existing `export { ... }` at the bottom of the file:

```js
export { persistItinerary, stopsToStops, toDateTime, fromDateTime, pacificDayISO, pacificOffset, memberRows, constraintColumns }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && node --test services/itinerary/persist.test.js`
Expected: PASS (all persist tests, including the 3 new ones).

- [ ] **Step 5: Stage for commit (user commits)**

```bash
cd backend && git add services/itinerary/persist.js services/itinerary/persist.test.js
```
Then PAUSE — tell the user the files are staged for them to commit (suggested message: `feat(backend): add Pacific fromDateTime + pacificDayISO helpers`).

---

### Task 2: `computeReorder` service (pure reschedule mapping)

The heart of the feature: a pure function that takes the itinerary's stops already ordered into the desired sequence and returns the DB rows to persist (new order + recomputed times + travel). It bridges the DB shape (ISO times + `pin` coords) and the scheduler's `HH:MM` domain, reusing `rescheduleStops` and `stopsToStops`. `mealType` is stripped from the scheduling input (so no meal is held) but re-attached for persistence.

**Files:**
- Create: `backend/services/itinerary/reorderStops.js`
- Test: `backend/services/itinerary/reorderStops.test.js`

**Interfaces:**
- Consumes: `rescheduleStops` (`../ai/fallback/schedule.js`), `stopsToStops` + `fromDateTime` + `pacificDayISO` (`./persist.js`).
- Produces:
  - `computeReorder(orderedStops, { dayStart, transport, tripDate }) => Row[]`
    - `orderedStops`: array of stops already in the desired order, each `{ id, pin: { id, latitude, longitude }, startTime, endTime, mealType, note }` (ISO `startTime`/`endTime`).
    - `dayStart`: itinerary `dayStart` (`'HH:MM'`) or `null`/`undefined`.
    - `transport`: itinerary `transport` (string) or `null`/`undefined`.
    - `tripDate`: `'YYYY-MM-DD'` or `null`/`undefined`.
    - `Row`: `{ id, orderInItinerary, startTime: Date, endTime: Date, travelTimeToNextMinutes, distanceToNextMeters }`.

- [ ] **Step 1: Write the failing tests**

Create `backend/services/itinerary/reorderStops.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { computeReorder } from './reorderStops.js'
import { fromDateTime } from './persist.js'

// Three SF venues; distances are non-trivial so travel time is inserted.
const pinA = { id: 1, latitude: 37.7955, longitude: -122.3937 } // Ferry Building
const pinB = { id: 2, latitude: 37.7614, longitude: -122.4241 } // Mission
const pinC = { id: 3, latitude: 37.7694, longitude: -122.4862 } // Golden Gate Park

// Original day: A 09:00-10:00, B 10:30-11:30, C 12:00-13:00 (PDT, 2026-07-15).
const iso = (hhmm) => new Date(`2026-07-15T${hhmm}:00-07:00`)
const stop = (id, pin, start, end, extra = {}) => ({
  id, pin, startTime: iso(start), endTime: iso(end), mealType: null, note: null, ...extra,
})

test('re-walks the clock in the new order, preserving dwell and inserting travel', () => {
  // Drag C to the front: new order C, A, B.
  const ordered = [
    stop(30, pinC, '12:00', '13:00'),
    stop(10, pinA, '09:00', '10:00'),
    stop(20, pinB, '10:30', '11:30'),
  ]
  const rows = computeReorder(ordered, { dayStart: '09:00', transport: 'walking', tripDate: '2026-07-15' })

  assert.equal(rows.length, 3)
  // Row order + ids follow the input order.
  assert.deepEqual(rows.map((r) => r.id), [30, 10, 20])
  assert.deepEqual(rows.map((r) => r.orderInItinerary), [0, 1, 2])
  // First stop starts at dayStart.
  assert.equal(fromDateTime(rows[0].startTime), '09:00')
  // Each dwell is preserved (60 min each).
  for (const r of rows) {
    assert.equal((r.endTime.getTime() - r.startTime.getTime()) / 60000, 60)
  }
  // Times are strictly increasing (travel inserted between stops).
  assert.ok(rows[1].startTime.getTime() >= rows[0].endTime.getTime())
  assert.ok(rows[2].startTime.getTime() >= rows[1].endTime.getTime())
  // Last stop carries no onward travel.
  assert.equal(rows[2].travelTimeToNextMinutes, null)
  assert.equal(rows[2].distanceToNextMeters, null)
  // Interior legs carry travel.
  assert.ok(rows[0].travelTimeToNextMinutes > 0)
})

test('does NOT hold a meal dragged before its window (dragged order wins)', () => {
  // A lunch-tagged stop dragged to be FIRST must not be pushed to the lunch window.
  const ordered = [
    stop(20, pinB, '12:00', '13:00', { mealType: 'lunch' }),
    stop(10, pinA, '09:00', '10:00'),
  ]
  const rows = computeReorder(ordered, { dayStart: '09:00', transport: 'walking', tripDate: '2026-07-15' })
  // The meal stays first, starting at dayStart — NOT held until noon.
  assert.equal(fromDateTime(rows[0].startTime), '09:00')
  assert.equal(rows[0].id, 20)
})

test('falls back to the earliest stop time when dayStart is null', () => {
  const ordered = [
    stop(10, pinA, '10:00', '11:00'),
    stop(20, pinB, '11:30', '12:30'),
  ]
  const rows = computeReorder(ordered, { dayStart: null, transport: null, tripDate: '2026-07-15' })
  assert.equal(fromDateTime(rows[0].startTime), '10:00')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && node --test services/itinerary/reorderStops.test.js`
Expected: FAIL — cannot find module `./reorderStops.js`.

- [ ] **Step 3: Implement the service**

Create `backend/services/itinerary/reorderStops.js`:

```js
// Recompute an itinerary's schedule after the owner drags its stops into a new
// order. Pure: takes the stops already in the desired order and returns the DB
// rows to persist (new order + recomputed times + travel legs). The controller
// owns loading/validating/persisting; this owns the shape bridge + reschedule.
//
// The scheduler (rescheduleStops) works in "HH:MM" and would HOLD a meal until
// its window opens. On a MANUAL reorder we honor the dragged order literally, so
// mealType is stripped from the scheduling input (no holding, no day-fill). The
// stored row still keeps mealType for display — see the re-attach below.
import { rescheduleStops } from '../ai/fallback/schedule.js'
import { stopsToStops, fromDateTime, pacificDayISO } from './persist.js'

// orderedStops = stops already in the desired order:
//   { id, pin: { id, latitude, longitude }, startTime, endTime, mealType, note }
// options = { dayStart?: 'HH:MM', transport?: string, tripDate?: 'YYYY-MM-DD' }
// Returns rows: { id, orderInItinerary, startTime, endTime,
//                 travelTimeToNextMinutes, distanceToNextMeters }
function computeReorder(orderedStops, { dayStart, transport, tripDate } = {}) {
  if (orderedStops.length === 0) return []

  // Bridge to the scheduler's domain: HH:MM arrive/depart + pin for coords.
  // mealType is intentionally omitted so no stop is held to a meal window.
  const schedIn = orderedStops.map((s) => ({
    id: s.id,
    pinId: s.pin.id,
    pin: s.pin,
    arriveTime: fromDateTime(s.startTime),
    departTime: fromDateTime(s.endTime),
  }))

  const startTime = dayStart || schedIn[0].arriveTime
  // Re-walk the clock only: no windowEndElapsed => no day-fill.
  const scheduled = rescheduleStops(schedIn, (s) => s.pin, startTime, transport ?? undefined)

  // Anchor the calendar day: the explicit tripDate, else the Pacific day of the
  // earliest existing stop (keeps the itinerary on its original day).
  const dayISO =
    tripDate ||
    pacificDayISO(
      orderedStops.reduce(
        (min, s) => (new Date(s.startTime) < new Date(min) ? s.startTime : min),
        orderedStops[0].startTime
      )
    )

  // Re-attach mealType/note so the persisted row keeps them (only the SCHEDULING
  // input dropped mealType), then convert HH:MM -> ISO with stopsToStops (which
  // sets orderInItinerary = index and handles the midnight roll + DST offset).
  const forPersist = scheduled.map((s, i) => ({
    ...s,
    mealType: orderedStops[i].mealType ?? undefined,
    note: orderedStops[i].note ?? undefined,
  }))
  const shortlist = orderedStops.map((s) => s.pin)
  const rows = stopsToStops(forPersist, shortlist, dayISO)

  // Re-attach the ItineraryStop id (stopsToStops keys by pinId and drops id).
  return rows.map((r, i) => ({
    id: orderedStops[i].id,
    orderInItinerary: r.orderInItinerary,
    startTime: r.startTime,
    endTime: r.endTime,
    travelTimeToNextMinutes: r.travelTimeToNextMinutes,
    distanceToNextMeters: r.distanceToNextMeters,
  }))
}

export { computeReorder }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && node --test services/itinerary/reorderStops.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Stage for commit (user commits)**

```bash
cd backend && git add services/itinerary/reorderStops.js services/itinerary/reorderStops.test.js
```
Then PAUSE (suggested message: `feat(backend): add computeReorder reschedule-mapping service`).

---

### Task 3: Model — load stops with pins + two-phase reorder write

Add the data-access pieces: a stops-with-pins loader (the controller needs `pin` coords) and an atomic two-phase reorder write that dodges the `@@unique([itineraryId, orderInItinerary])` collision.

**Files:**
- Modify: `backend/models/itineraryStops.js`

**Interfaces:**
- Consumes: `computeReorder` output rows (from Task 2).
- Produces:
  - `findManyByItineraryWithPins(itineraryId) => Promise<Stop[]>` — the itinerary's stops, `include: { pin: true }`, ordered by `orderInItinerary asc`.
  - `reorderStops(itineraryId, rows) => Promise<void>` — atomically writes each row's order + times + travel; `rows` = `computeReorder` output.

- [ ] **Step 1: Add the loader and the two-phase write**

In `backend/models/itineraryStops.js`, add before the `export` line:

```js
function findManyByItineraryWithPins(itineraryId) {
  return prisma.itineraryStop.findMany({
    where: { itineraryId },
    include: { pin: true },
    orderBy: { orderInItinerary: 'asc' },
  })
}

// Persist a full reorder atomically. @@unique([itineraryId, orderInItinerary]) is
// not deferrable, so a one-pass write that swaps two stops' orders can transiently
// collide. Two phases inside one transaction: first park every stop at a negative
// (collision-free) order, then write the final order + recomputed times/travel.
// rows = [{ id, orderInItinerary, startTime, endTime,
//           travelTimeToNextMinutes, distanceToNextMeters }]
function reorderStops(itineraryId, rows) {
  return prisma.$transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      await tx.itineraryStop.update({
        where: { id: rows[i].id },
        data: { orderInItinerary: -1 - i },
      })
    }
    for (const r of rows) {
      await tx.itineraryStop.update({
        where: { id: r.id },
        data: {
          orderInItinerary: r.orderInItinerary,
          startTime: r.startTime,
          endTime: r.endTime,
          travelTimeToNextMinutes: r.travelTimeToNextMinutes,
          distanceToNextMeters: r.distanceToNextMeters,
        },
      })
    }
  })
}
```

Update the export:

```js
export { create, findByIdWithItinerary, findManyByItinerary, findManyByItineraryWithPins, update, remove, reorderStops }
```

- [ ] **Step 2: Verify the module loads (no DB call)**

Run: `cd backend && node -e "import('./models/itineraryStops.js').then(m => { if (typeof m.reorderStops !== 'function' || typeof m.findManyByItineraryWithPins !== 'function') { throw new Error('missing exports') } console.log('ok') })"`
Expected: prints `ok`.

- [ ] **Step 3: Stage for commit (user commits)**

```bash
cd backend && git add models/itineraryStops.js
```
Then PAUSE (suggested message: `feat(backend): add stops-with-pins loader + two-phase reorder write`).

---

### Task 4: Controller + route — `PUT /itineraries/:id/stops/order`

Wire the HTTP endpoint: owner gate, validate `stopIds` is exactly the itinerary's current stop set, run `computeReorder`, persist via the model, return the updated itinerary.

**Files:**
- Modify: `backend/controllers/itineraryController.js`
- Modify: `backend/routes/itineraryRoutes.js`

**Interfaces:**
- Consumes: `itineraries.findByIdBasic` / `itineraries.findById` (existing), `itineraryStops.findManyByItineraryWithPins` + `itineraryStops.reorderStops` (Task 3), `computeReorder` (Task 2), `loadOwned` + `parseIdParam` (existing helpers).
- Produces: `reorderItineraryStops(req, res)` handler; route `PUT /:id/stops/order`.

- [ ] **Step 1: Add imports to the controller**

In `backend/controllers/itineraryController.js`, extend the existing imports. Add the model + service:

```js
import * as itineraryStops from '../models/itineraryStops.js'
import { computeReorder } from '../services/itinerary/reorderStops.js'
```

(Place them with the other model/service imports at the top of the file.)

- [ ] **Step 2: Add the handler**

Add after `updateItinerary` (before `deleteItinerary`) in `backend/controllers/itineraryController.js`:

```js
// PUT /itineraries/:id/stops/order
// Reorder the caller's own itinerary. Body: { stopIds: number[] } — every stop
// id of this itinerary, in the new order. Recomputes each stop's time + travel
// from the new order (re-walk only; meals are not held) and persists atomically.
async function reorderItineraryStops(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  const itinerary = await loadOwned(res, itineraries.findByIdBasic, id, req.user.id, {
    label: 'Itinerary',
    action: 'edit',
  })
  if (!itinerary) return

  const { stopIds } = req.body
  if (!Array.isArray(stopIds) || stopIds.some((s) => !Number.isInteger(s))) {
    return res.status(400).json({ error: 'stopIds must be an array of stop ids' })
  }

  const current = await itineraryStops.findManyByItineraryWithPins(id)
  const currentIds = current.map((s) => s.id)
  // stopIds must be exactly the current set — same length, no dupes, no unknowns.
  const sameSet =
    stopIds.length === currentIds.length &&
    new Set(stopIds).size === stopIds.length &&
    stopIds.every((sid) => currentIds.includes(sid))
  if (!sameSet) {
    return res.status(400).json({ error: 'stopIds must list every stop of this itinerary exactly once' })
  }

  try {
    const byId = new Map(current.map((s) => [s.id, s]))
    const ordered = stopIds.map((sid) => byId.get(sid))
    const tripDate = itinerary.tripDate
      ? itinerary.tripDate.toISOString().slice(0, 10)
      : null
    const rows = computeReorder(ordered, {
      dayStart: itinerary.dayStart,
      transport: itinerary.transport,
      tripDate,
    })
    await itineraryStops.reorderStops(id, rows)
    const updated = await itineraries.findById(id, { forOwner: true })
    return res.status(200).json(updated)
  } catch (err) {
    console.error('Reorder stops failed:', err)
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Stop order conflict, please retry' })
    }
    return res.status(500).json({ error: 'Failed to reorder stops' })
  }
}
```

Add `reorderItineraryStops` to the controller's bottom `export { ... }` list.

- [ ] **Step 3: Wire the route**

In `backend/routes/itineraryRoutes.js`, add `reorderItineraryStops` to the import block from `../controllers/itineraryController.js`, and add the route with the other `/:id/...` sub-resource routes (e.g. right after `router.put('/:id', requireAuth, updateItinerary)`):

```js
router.put('/:id/stops/order', requireAuth, reorderItineraryStops)
```

- [ ] **Step 4: Verify the server boots and routes load**

Run: `cd backend && node -e "import('./routes/itineraryRoutes.js').then(() => console.log('routes ok'))"`
Expected: prints `routes ok` (no import/reference errors).

- [ ] **Step 5: Run the full backend test suite (baseline check)**

Run: `cd backend && npm test 2>&1 | tail -20`
Expected: the new persist + reorder tests pass; total failures ≤ the known baseline of 6 (mealBlock utils + DB-integration). No NEW failures.

- [ ] **Step 6: Stage for commit (user commits)**

```bash
cd backend && git add controllers/itineraryController.js routes/itineraryRoutes.js
```
Then PAUSE (suggested message: `feat(backend): add PUT /itineraries/:id/stops/order reorder endpoint`).

---

### Task 5: Frontend — dnd-kit sortable timeline

Install dnd-kit and make the owner's stop cards draggable inside `WrittenItinerary.jsx`. Non-owners render exactly as today. The sortable item is a component defined INSIDE `WrittenItinerary.jsx` (no new file), mirroring the existing local `RemoveStopControl`.

**Files:**
- Modify: `frontend/package.json` (add deps)
- Modify: `frontend/src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.jsx`
- Modify: `frontend/src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.css`

**Interfaces:**
- Consumes: a new `onReorderStops(stopIds: number[])` prop (wired in Task 6).
- Produces: drag interaction that calls `onReorderStops` with the new stop-id order on drop.

- [ ] **Step 1: Install dnd-kit**

Run: `cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
Expected: the three packages are added to `frontend/package.json` dependencies and install cleanly.

- [ ] **Step 2: Rewrite `WrittenItinerary.jsx` to a sortable list (owner) / plain list (viewer)**

Replace the contents of `frontend/src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.jsx` with:

```jsx
import './WrittenItinerary.css'
import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import PinName from '../PinName/PinName.jsx'
import PinTiming from '../PinTiming/PinTiming.jsx'
import PinCost from '../PinCost/PinCost.jsx'
import PinAddress from '../PinAddress/PinAddress.jsx'
import AddStopPanel from '../AddStopPanel/AddStopPanel.jsx'

// A meal badge if the stop was tagged breakfast/lunch/dinner (persist.js folds
// mealType into the pin's tags).
const MEALS = ['breakfast', 'lunch', 'dinner'];
function mealOf(tags = []) {
  return tags.find((t) => MEALS.includes(t));
}

// A stop's remove control: a trash button that flips to an inline "Remove?"
// confirm so a delete always takes two deliberate clicks (never one).
function RemoveStopControl({ onConfirm }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="timeline-stop__confirm">
        <span>Remove?</span>
        <button type="button" className="timeline-stop__confirm-yes" onClick={onConfirm}>
          Remove
        </button>
        <button type="button" className="timeline-stop__confirm-no" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="timeline-stop__remove"
      aria-label="Remove stop"
      onClick={() => setConfirming(true)}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    </button>
  );
}

// The inner content of a stop card — shared by the draggable (owner) and static
// (viewer) rows so the two never drift.
function StopCard({ pin, index, total, meal, editable, onRemoveStop, onEditStop, siblings, dragHandle }) {
  return (
    <>
      <div className="timeline-stop__rail">
        <span className="timeline-stop__num">{index + 1}</span>
        {index < total - 1 && <span className="timeline-stop__line" />}
      </div>

      <div className="timeline-stop__card">
        <div className="timeline-stop__head">
          {dragHandle}
          <PinName name={pin.name} />
          {meal && <span className="timeline-stop__meal">{meal}</span>}
          {editable && pin.stopId != null && (
            <RemoveStopControl onConfirm={() => onRemoveStop(pin.stopId)} />
          )}
        </div>
        <PinTiming
          startTime={pin.startTime}
          endTime={pin.endTime}
          editable={editable}
          stopId={pin.stopId}
          onEditStop={onEditStop}
          siblings={siblings}
        />
        {pin.address && <PinAddress address={pin.address} />}
        {pin.description && <p className="timeline-stop__desc">{pin.description}</p>}
        <PinCost cost={pin.pricePerPerson} />
      </div>
    </>
  );
}

// A draggable timeline row (owner mode). useSortable keys off the stop id; the
// drag handle carries the listeners so the card body stays interactive (the
// inline time editor, remove button, etc.).
function SortableStop({ pin, index, total, meal, onRemoveStop, onEditStop, siblings }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: pin.stopId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const handle = (
    <button
      type="button"
      className="timeline-stop__drag"
      aria-label="Drag to reorder stop"
      {...attributes}
      {...listeners}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
        <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
        <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
        <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
      </svg>
    </button>
  );
  return (
    <li ref={setNodeRef} style={style} className="timeline-stop">
      <StopCard
        pin={pin}
        index={index}
        total={total}
        meal={meal}
        editable
        onRemoveStop={onRemoveStop}
        onEditStop={onEditStop}
        siblings={siblings}
        dragHandle={handle}
      />
    </li>
  );
}

// Wanderlog-style vertical timeline. For the owner (`editable`) each stop is
// draggable (dnd-kit) and dropping calls onReorderStops with the new id order.
function WrittenItinerary({ pins = [], editable = false, onRemoveStop, onEditStop, onAddStop, onReorderStops }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (pins.length === 0) {
    return (
      <div className="written-itinerary">
        <p className="written-itinerary__empty">No stops in this itinerary yet.</p>
        {editable && <AddStopPanel onAddStop={onAddStop} />}
      </div>
    );
  }

  const siblingsFor = (pin) =>
    pins.filter((p) => p.stopId !== pin.stopId).map((p) => ({ startTime: p.startTime, endTime: p.endTime }));

  // Viewer (read-only) timeline — unchanged behavior, no drag.
  if (!editable) {
    return (
      <ol className="written-itinerary">
        {pins.map((pin, i) => (
          <li key={pin.stopId ?? pin.id ?? pin.orderInItinerary} className="timeline-stop">
            <StopCard
              pin={pin}
              index={i}
              total={pins.length}
              meal={mealOf(pin.tags)}
              editable={false}
              onRemoveStop={onRemoveStop}
              onEditStop={onEditStop}
              siblings={siblingsFor(pin)}
              dragHandle={null}
            />
          </li>
        ))}
      </ol>
    );
  }

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pins.findIndex((p) => p.stopId === active.id);
    const newIndex = pins.findIndex((p) => p.stopId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(pins, oldIndex, newIndex).map((p) => p.stopId);
    onReorderStops(newOrder);
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pins.map((p) => p.stopId)} strategy={verticalListSortingStrategy}>
          <ol className="written-itinerary">
            {pins.map((pin, i) => (
              <SortableStop
                key={pin.stopId}
                pin={pin}
                index={i}
                total={pins.length}
                meal={mealOf(pin.tags)}
                onRemoveStop={onRemoveStop}
                onEditStop={onEditStop}
                siblings={siblingsFor(pin)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <AddStopPanel onAddStop={onAddStop} />
    </>
  );
}

export default WrittenItinerary;
```

- [ ] **Step 3: Add drag-handle styles**

Append to `frontend/src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.css`:

```css
/* Drag handle for owner reorder — a grab affordance on the left of the head row,
   styled like the other neutral icon controls (matches .timeline-stop__remove). */
.timeline-stop__drag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--slate-500);
  cursor: grab;
  touch-action: none;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}
.timeline-stop__drag:hover {
  color: var(--accent-strong);
  border-color: var(--accent);
}
.timeline-stop__drag:active {
  cursor: grabbing;
}
.timeline-stop__drag:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: no lint errors, build succeeds.

- [ ] **Step 5: Stage for commit (user commits)**

```bash
cd frontend && git add package.json package-lock.json src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.jsx src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.css
```
Then PAUSE (suggested message: `feat(frontend): draggable itinerary stops via dnd-kit`).

---

### Task 6: Frontend — API + page wiring

Add the API call and the optimistic reorder handler, and thread `onReorderStops` from `ItineraryPage` through `ItineraryPanel` to `WrittenItinerary`.

**Files:**
- Modify: `frontend/src/api/itinerary.js`
- Modify: `frontend/src/pages/ItineraryPage/ItineraryPage.jsx`
- Modify: `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx`

**Interfaces:**
- Consumes: `PUT /itineraries/:id/stops/order` (Task 4), `onReorderStops` prop (Task 5).
- Produces: `reorderStops(itineraryId, stopIds)` API fn; `handleReorderStops(stopIds)` handler.

- [ ] **Step 1: Add the API function**

Append to `frontend/src/api/itinerary.js`:

```js
// PUT /itineraries/:id/stops/order — reorder a stop (owner only). Body:
// { stopIds } — every stop id of the itinerary, in the new order. The backend
// recomputes each stop's time + travel and returns the updated itinerary.
export async function reorderStops(itineraryId, stopIds) {
  const { data } = await api.put(`/itineraries/${itineraryId}/stops/order`, { stopIds })
  return data
}
```

- [ ] **Step 2: Add the handler in `ItineraryPage.jsx`**

Import `reorderStops` — extend the existing `../../api/itinerary.js` import block:

```js
import {
  getItinerary,
  deleteItinerary,
  copyItinerary,
  addStop,
  deleteStop,
  updateStop,
  updateItinerary,
  uploadItineraryCover,
  reorderStops,
} from '../../api/itinerary.js'
```

(Note: `uploadItineraryCover` is used by `handleEditItinerary` but may be missing from the current import list — add it here if absent.)

Add the handler alongside the other stop handlers (e.g. after `handleAddStop`):

```js
  // Owner-only: reorder stops by drag. Optimistic — reorder the cached pins
  // immediately, then PUT the new id order. The backend recomputes times/travel
  // and returns the authoritative itinerary; on failure we roll back to the
  // pre-drag cache. Uses setQueryData (NOT the stale setItinerary) per the
  // React Query cache model.
  const handleReorderStops = async (stopIds) => {
    const previous = patchItinerary((prev) => {
      const byId = new Map(prev.pins.map((p) => [p.stopId, p]));
      return { ...prev, pins: stopIds.map((sid) => byId.get(sid)).filter(Boolean) };
    });
    try {
      const updated = await reorderStops(id, stopIds);
      queryClient.setQueryData(itineraryKey, updated);
    } catch (err) {
      console.error('Reorder stops failed, reverting:', err);
      queryClient.setQueryData(itineraryKey, previous);
      window.alert(err.response?.data?.error || 'Could not reorder the stops. Please try again.');
    }
  };
```

Pass it into `<ItineraryPanel>` (add to the existing prop list):

```jsx
        onReorderStops={handleReorderStops}
```

- [ ] **Step 3: Thread the prop through `ItineraryPanel.jsx`**

Add `onReorderStops` to the destructured props of `ItineraryPanel` (with the other `on*` stop props), then pass it to `WrittenItinerary`:

```jsx
        <WrittenItinerary
          pins={pins}
          editable={isOwner}
          onRemoveStop={onRemoveStop}
          onEditStop={onEditStop}
          onAddStop={onAddStop}
          onReorderStops={onReorderStops}
        />
```

- [ ] **Step 4: Lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: no lint errors, build succeeds.

- [ ] **Step 5: Manual end-to-end verification**

With both servers running (`cd backend && npm start`, `cd frontend && npm run dev`):
1. Open an itinerary you OWN with ≥3 stops.
2. Drag a stop's handle to a new position → the card order updates immediately, and after the request the times/travel re-walk from the new order (first stop keeps the day start; dwells preserved; a meal dragged early is NOT pushed to its window).
3. Reload the page → the new order + times persist.
4. Open the SAME itinerary as a NON-owner (log in as another user, public itinerary) → no drag handles; the timeline is read-only.
5. Simulate a failure (e.g. stop the backend) and drag → the order rolls back and an alert shows.

- [ ] **Step 6: Stage for commit (user commits)**

```bash
cd frontend && git add src/api/itinerary.js src/pages/ItineraryPage/ItineraryPage.jsx src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx
```
Then PAUSE (suggested message: `feat(frontend): wire drag-to-reorder to the reorder endpoint`).

---

## Self-Review Notes

- **Spec coverage:** Approach A endpoint (Task 4) ✓; re-walk-only via `mealType`-strip (Task 2) ✓; `@dnd-kit` (Task 5) ✓; two-phase unique-constraint-safe write (Task 3) ✓; owner-gate + validation (Task 4) ✓; `fromDateTime` helper (Task 1) ✓; no new frontend files (Tasks 5–6, sortable item is in-file) ✓; tests (Tasks 1–2) ✓.
- **Edge cases handled:** empty stop list (`computeReorder` returns `[]`; endpoint still validates the empty set); `dayStart`/`transport`/`tripDate` all null (fallbacks in Task 2); non-owner (403 via `loadOwned`); malformed `stopIds` (400); order collision (409).
- **Pre-existing bug avoided:** `handleEditStop`/`handleEditItinerary` reference an undefined `setItinerary` (dead since the React Query refactor). The new `handleReorderStops` deliberately uses `patchItinerary`/`setQueryData` instead. Fixing the old handlers is out of scope.
