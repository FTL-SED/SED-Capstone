import { test } from 'node:test'
import assert from 'node:assert/strict'

import { fallbackSequence, nearestNeighborOrder } from './fallback.js'
import { validateItinerary } from '../validation/validate.js'

// A shortlist spread across SF with a mix of activities and restaurants.
const shortlist = [
  { id: 1, name: 'Ferry Building', category: 'activity', latitude: 37.7955, longitude: -122.3937, pricePerPerson: 0, address: 'San Francisco' },
  { id: 2, name: 'Coit Tower', category: 'activity', latitude: 37.8024, longitude: -122.4058, pricePerPerson: 10, address: 'San Francisco' },
  { id: 3, name: 'Tartine', category: 'restaurant', latitude: 37.7614, longitude: -122.4241, pricePerPerson: 25, address: 'San Francisco' },
  { id: 4, name: 'Golden Gate Park', category: 'activity', latitude: 37.7694, longitude: -122.4862, pricePerPerson: 0, address: 'San Francisco' },
  { id: 5, name: 'Zuni Cafe', category: 'restaurant', latitude: 37.7734, longitude: -122.4225, pricePerPerson: 40, address: 'San Francisco' },
]

const constraints = {
  timeWindow: { startTime: '09:00', endTime: '21:00' },
  maxBudgetPerPerson: 100,
  groupSize: 2, // cap = 200
}

test('produces a feasible itinerary that PASSES validation (same-schema promise)', () => {
  const result = fallbackSequence(shortlist, constraints)
  assert.equal(result.feasible, true)
  const { valid, errors } = validateItinerary(result, shortlist, constraints)
  assert.deepEqual(errors, [])
  assert.equal(valid, true)
})

test('every stop references a real shortlist pin', () => {
  const ids = new Set(shortlist.map((p) => p.id))
  const result = fallbackSequence(shortlist, constraints)
  for (const stop of result.stops) assert.ok(ids.has(stop.pinId))
})

test('is deterministic — same input yields identical output', () => {
  const a = fallbackSequence(shortlist, constraints)
  const b = fallbackSequence(shortlist, constraints)
  assert.deepEqual(a, b)
})

test('nearestNeighborOrder starts with the pin closest to the anchor', () => {
  const anchor = { latitude: 37.7955, longitude: -122.3937 } // at the Ferry Building
  const ordered = nearestNeighborOrder(shortlist, anchor)
  assert.equal(ordered[0].id, 1) // Ferry Building is closest to itself
})

test('assigns arrive/depart times in chronological, non-overlapping order', () => {
  const { stops } = fallbackSequence(shortlist, constraints)
  for (let i = 1; i < stops.length; i++) {
    const prevDepart = stops[i - 1].departTime
    assert.ok(stops[i].arriveTime >= prevDepart, `stop ${i} arrives before previous departs`)
  }
})

test('never books more than one meal per block', () => {
  const { stops } = fallbackSequence(shortlist, constraints)
  const counts = {}
  for (const s of stops) {
    if (s.mealType) counts[s.mealType] = (counts[s.mealType] ?? 0) + 1
  }
  for (const [block, n] of Object.entries(counts)) {
    assert.ok(n <= 1, `${n} meals in ${block}`)
  }
})

test('backfills travel legs on all but the last stop', () => {
  const { stops } = fallbackSequence(shortlist, constraints)
  for (let i = 0; i < stops.length - 1; i++) {
    assert.equal(typeof stops[i].travelTimeToNextMinutes, 'number')
    assert.equal(typeof stops[i].distanceToNextMeters, 'number')
  }
  const last = stops[stops.length - 1]
  assert.equal(last.travelTimeToNextMinutes, null)
  assert.equal(last.distanceToNextMeters, null)
})

test('respects the per-person budget cap', () => {
  const tight = { ...constraints, maxBudgetPerPerson: 30 } // cap = 30/person
  const { stops } = fallbackSequence(shortlist, tight)
  // Stops carry no cost — sum the chosen pins' prices from the shortlist.
  const priceById = new Map(shortlist.map((p) => [p.id, p.pricePerPerson]))
  const total = stops.reduce((s, x) => s + (priceById.get(x.pinId) ?? 0), 0)
  assert.ok(total <= 30, `total ${total} exceeds cap 30`)
})

test('a budget-skipped stop does not consume clock time from later stops', () => {
  // Three cheap pins the day would keep, with one expensive pin wedged in the
  // middle of the route that budget forces us to skip. The kept stops' arrival
  // times must match a run where the expensive pin isn't in the list at all —
  // i.e. skipping it must not advance the clock by phantom travel to a place we
  // never visit. (Regression for the fallback clock-inflation bug.)
  const cheap = [
    { id: 1, name: 'A', category: 'activity', latitude: 37.795, longitude: -122.394, pricePerPerson: 0, address: 'SF' },
    { id: 2, name: 'B (pricey)', category: 'activity', latitude: 37.802, longitude: -122.406, pricePerPerson: 500, address: 'SF' },
    { id: 3, name: 'C', category: 'activity', latitude: 37.769, longitude: -122.486, pricePerPerson: 0, address: 'SF' },
  ]
  const cons = { timeWindow: { startTime: '09:00', endTime: '21:00' }, maxBudgetPerPerson: 50, groupSize: 1 }

  const withPricey = fallbackSequence(cheap, cons)
  // The pricey pin must be skipped (over the 50 cap).
  assert.ok(!withPricey.stops.some((s) => s.pinId === 2), 'pricey pin should be skipped for budget')

  // Same run with the pricey pin absent entirely.
  const withoutPricey = fallbackSequence(cheap.filter((p) => p.id !== 2), cons)

  // The kept stops (ids 1 and 3, same nearest-neighbor order) must have
  // identical arrive/depart times in both runs — the skip cost no time.
  const times = (r) => r.stops.map((s) => [s.pinId, s.arriveTime, s.departTime])
  assert.deepEqual(times(withPricey), times(withoutPricey))
})

test('returns { feasible: false } for an empty shortlist', () => {
  const result = fallbackSequence([], constraints)
  assert.equal(result.feasible, false)
  assert.match(result.reason, /No places/)
})

test('returns { feasible: false } for a zero-length time window', () => {
  const result = fallbackSequence(shortlist, {
    ...constraints,
    timeWindow: { startTime: '09:00', endTime: '09:00' },
  })
  assert.equal(result.feasible, false)
})

test('sequences an overnight window (endTime < startTime crosses midnight)', () => {
  // 20:00 → 02:00 is a valid 6-hour late-night window, not inverted.
  const result = fallbackSequence(shortlist, {
    ...constraints,
    timeWindow: { startTime: '20:00', endTime: '02:00' },
  })
  assert.equal(result.feasible, true)
  assert.ok(result.stops.length > 0)
  // The first stop starts at the window start; a later stop may legitimately
  // show an after-midnight wall-clock time (e.g. "00:30").
  assert.equal(result.stops[0].arriveTime, '20:00')
})

test('works without a timeWindow (falls back to a default day)', () => {
  const result = fallbackSequence(shortlist, { maxBudgetPerPerson: 100, groupSize: 2 })
  assert.equal(result.feasible, true)
  assert.ok(result.stops.length > 0)
})

test('fallback: full-day trip seats a lunch AND a dinner meal', () => {
  const shortlist = [
    { id: 1, name: 'Museum', category: 'activity', pricePerPerson: 20, latitude: 37.785, longitude: -122.401, rating: 4.6 },
    { id: 2, name: 'Park', category: 'activity', pricePerPerson: 0, latitude: 37.769, longitude: -122.456, rating: 4.8 },
    { id: 3, name: 'Viewpoint', category: 'activity', pricePerPerson: 0, latitude: 37.802, longitude: -122.405, rating: 4.5 },
    { id: 10, name: 'Taqueria', category: 'restaurant', pricePerPerson: 14, latitude: 37.751, longitude: -122.418, rating: 4.5 },
    { id: 11, name: 'Ramen', category: 'restaurant', pricePerPerson: 22, latitude: 37.785, longitude: -122.432, rating: 4.7 },
  ]
  const constraints = {
    timeWindow: { startTime: '10:00', endTime: '20:30' },
    maxBudgetPerPerson: 120,
    transport: 'driving',
    includeMeals: true,
    foodBelowMin: false,
  }
  const result = fallbackSequence(shortlist, constraints)
  assert.equal(result.feasible, true)
  const mealTypes = new Set(result.stops.filter((s) => s.mealType).map((s) => s.mealType))
  assert.ok(mealTypes.has('lunch'), 'expected a lunch meal')
  assert.ok(mealTypes.has('dinner'), 'expected a dinner meal')
})

test('fallback: includeMeals=false seats no meals', () => {
  const shortlist = [
    { id: 1, name: 'Museum', category: 'activity', pricePerPerson: 20, latitude: 37.785, longitude: -122.401, rating: 4.6 },
    { id: 10, name: 'Taqueria', category: 'restaurant', pricePerPerson: 14, latitude: 37.751, longitude: -122.418, rating: 4.5 },
  ]
  const constraints = {
    timeWindow: { startTime: '10:00', endTime: '20:30' },
    maxBudgetPerPerson: 120,
    transport: 'driving',
    includeMeals: false,
  }
  const result = fallbackSequence(shortlist, constraints)
  assert.equal(result.feasible, true)
  assert.equal(result.stops.filter((s) => s.mealType).length, 0)
})
