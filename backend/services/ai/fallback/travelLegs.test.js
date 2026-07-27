import { test } from 'node:test'
import assert from 'node:assert/strict'
import { backfillTravelLegs } from './travelLegs.js'

// Two SF points ~1.6 miles apart.
const A = { latitude: 37.7749, longitude: -122.4194 }
const B = { latitude: 37.7849, longitude: -122.4094 }

test('backfillTravelLegs: fills each leg, nulls the last stop', () => {
  const stops = [{ pinId: 1 }, { pinId: 2 }, { pinId: 3 }]
  const coords = { 1: A, 2: B, 3: A }
  backfillTravelLegs(stops, (s) => coords[s.pinId], 'driving')

  assert.ok(typeof stops[0].travelTimeToNextMinutes === 'number' && stops[0].travelTimeToNextMinutes >= 0)
  assert.ok(typeof stops[0].distanceToNextMeters === 'number' && stops[0].distanceToNextMeters >= 0)
  assert.equal(stops[2].travelTimeToNextMinutes, null)
  assert.equal(stops[2].distanceToNextMeters, null)
})

test('backfillTravelLegs: a missing coord nulls that leg', () => {
  const stops = [{ pinId: 1 }, { pinId: 2 }]
  backfillTravelLegs(stops, (s) => (s.pinId === 1 ? A : null), 'walking')
  assert.equal(stops[0].travelTimeToNextMinutes, null)
  assert.equal(stops[0].distanceToNextMeters, null)
})
