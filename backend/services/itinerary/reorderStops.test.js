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

test('anchors on the EARLIEST existing start, not the dragged-to-front stop (dayStart null)', () => {
  // Regression: with no dayStart, dragging a LATER stop to the front must keep
  // the day anchored at the earliest original time (09:00) — not re-clock the
  // whole day to the dragged stop's time (which made swaps look like no-ops).
  const ordered = [
    stop(30, pinC, '12:00', '13:00'), // dragged to front (was last)
    stop(10, pinA, '09:00', '10:00'), // the true earliest start
    stop(20, pinB, '10:30', '11:30'),
  ]
  const rows = computeReorder(ordered, { dayStart: null, transport: 'walking', tripDate: '2026-07-15' })
  // Order still follows the drag...
  assert.deepEqual(rows.map((r) => r.id), [30, 10, 20])
  // ...but the day starts at 09:00 (earliest), NOT 12:00 (the dragged stop).
  assert.equal(fromDateTime(rows[0].startTime), '09:00')
})
