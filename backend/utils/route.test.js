import { test } from 'node:test'
import assert from 'node:assert/strict'

import { optimizeRoute, routeMiles } from './route.js'

// Four points roughly on a line west→east. coordOf reads them by pinId.
const coords = {
  1: { latitude: 37.77, longitude: -122.50 }, // far west
  2: { latitude: 37.77, longitude: -122.45 },
  3: { latitude: 37.77, longitude: -122.40 },
  4: { latitude: 37.77, longitude: -122.35 }, // far east
}
const coordOf = (stop) => coords[stop.pinId]

const stop = (pinId, extra = {}) => ({ pinId, arriveTime: '10:00', departTime: '11:00', estimatedCostPerPerson: 0, ...extra })

test('reorders scrambled stops into the shortest (monotonic) route', () => {
  const scrambled = [stop(1), stop(4), stop(2), stop(3)] // W, E, ...
  const optimized = optimizeRoute(scrambled, coordOf)
  const ids = optimized.map((s) => s.pinId)
  // Shortest path across a line is the sorted traversal (either direction).
  assert.ok(
    JSON.stringify(ids) === JSON.stringify([1, 2, 3, 4]) ||
      JSON.stringify(ids) === JSON.stringify([4, 3, 2, 1]),
    `expected monotonic order, got ${ids}`
  )
})

test('never produces a longer route than the input order', () => {
  const scrambled = [stop(1), stop(4), stop(2), stop(3)]
  const before = routeMiles(scrambled, coordOf)
  const after = routeMiles(optimizeRoute(scrambled, coordOf), coordOf)
  assert.ok(after <= before)
})

test('keeps a meal stop anchored at its original index', () => {
  // Meal (pinId 4, far east) is placed at index 1 and must stay there even
  // though a shortest-path solver would move it to an end.
  const stops = [stop(1), stop(4, { mealType: 'lunch' }), stop(2), stop(3)]
  const optimized = optimizeRoute(stops, coordOf)
  assert.equal(optimized[1].pinId, 4)
  assert.equal(optimized[1].mealType, 'lunch')
})

test('reorders only the non-meal stops around anchored meals', () => {
  const stops = [stop(3), stop(4, { mealType: 'lunch' }), stop(1), stop(2)]
  const optimized = optimizeRoute(stops, coordOf)
  // Index 1 stays the meal; the other three slots hold {1,2,3} in some order.
  assert.equal(optimized[1].pinId, 4)
  const others = [optimized[0], optimized[2], optimized[3]].map((s) => s.pinId).sort()
  assert.deepEqual(others, [1, 2, 3])
})

test('returns stops unchanged when there is nothing to reorder', () => {
  assert.deepEqual(optimizeRoute([stop(1)], coordOf), [stop(1)])
  assert.deepEqual(optimizeRoute([], coordOf), [])
})

test('preserves all stops (no drops or duplicates)', () => {
  const stops = [stop(1), stop(2), stop(3), stop(4)]
  const optimized = optimizeRoute(stops, coordOf)
  assert.deepEqual(optimized.map((s) => s.pinId).sort(), [1, 2, 3, 4])
})
