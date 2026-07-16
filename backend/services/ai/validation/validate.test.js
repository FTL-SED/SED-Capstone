import { test } from 'node:test'
import assert from 'node:assert/strict'

import { validateItinerary } from './validate.js'

// A small shortlist the itineraries below reference by id. Ids 1/2 are
// activities, 3/4 are restaurants — enough to exercise every rule.
const shortlist = [
  { id: 1, name: 'Ferry Building', category: 'activity', latitude: 37.79, longitude: -122.39 },
  { id: 2, name: 'Golden Gate Park', category: 'activity', latitude: 37.77, longitude: -122.48 },
  { id: 3, name: 'Tartine', category: 'restaurant', latitude: 37.76, longitude: -122.42 },
  { id: 4, name: 'Zuni Cafe', category: 'restaurant', latitude: 37.77, longitude: -122.42 },
]

const constraints = {
  timeWindow: { startTime: '09:00', endTime: '21:00' },
  maxBudgetPerPerson: 100,
  groupSize: 2, // budget cap = 200
}

// A clean, feasible itinerary that satisfies every rule — the baseline the
// negative tests each break exactly one rule from.
const goodItinerary = {
  feasible: true,
  title: 'A Day in San Francisco',
  location: 'San Francisco',
  description: 'A relaxed group day.',
  stops: [
    { pinId: 1, arriveTime: '09:30', departTime: '11:00', estimatedCostPerPerson: 0 },
    { pinId: 3, arriveTime: '12:00', departTime: '13:00', estimatedCostPerPerson: 30, mealType: 'lunch' },
    { pinId: 2, arriveTime: '13:30', departTime: '17:00', estimatedCostPerPerson: 20 },
    { pinId: 4, arriveTime: '18:00', departTime: '19:00', estimatedCostPerPerson: 40, mealType: 'dinner' },
  ],
}

test('accepts a well-formed, in-budget, in-window itinerary', () => {
  const { valid, errors } = validateItinerary(goodItinerary, shortlist, constraints)
  assert.deepEqual(errors, [])
  assert.equal(valid, true)
})

test('accepts a { feasible: false, reason } result as a legitimate answer', () => {
  const result = { feasible: false, reason: 'Budget too low for any restaurant.' }
  const { valid } = validateItinerary(result, shortlist, constraints)
  assert.equal(valid, true)
})

test('rejects an infeasible result with no reason', () => {
  const { valid, errors } = validateItinerary({ feasible: false }, shortlist, constraints)
  assert.equal(valid, false)
  assert.match(errors[0], /reason/)
})

test('rejects a hallucinated pinId not in the shortlist', () => {
  const bad = {
    ...goodItinerary,
    stops: [{ pinId: 999, arriveTime: '10:00', departTime: '11:00', estimatedCostPerPerson: 0 }],
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /hallucinated/.test(e)))
})

test('rejects an over-budget itinerary', () => {
  const bad = {
    ...goodItinerary,
    stops: [
      { pinId: 3, arriveTime: '12:00', departTime: '13:00', estimatedCostPerPerson: 150 },
      { pinId: 4, arriveTime: '18:00', departTime: '19:00', estimatedCostPerPerson: 150 }, // 300 > 200
    ],
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /exceeds budget/.test(e)))
})

test('rejects two meals in the same block (double lunch)', () => {
  const bad = {
    ...goodItinerary,
    stops: [
      { pinId: 3, arriveTime: '12:00', departTime: '12:45', estimatedCostPerPerson: 20, mealType: 'lunch' },
      { pinId: 4, arriveTime: '13:00', departTime: '13:30', estimatedCostPerPerson: 20, mealType: 'lunch' },
    ],
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /lunch block/.test(e)))
})

test('detects a double meal block even when mealType is omitted (inferred from arriveTime)', () => {
  const bad = {
    ...goodItinerary,
    stops: [
      { pinId: 3, arriveTime: '12:00', departTime: '12:30', estimatedCostPerPerson: 20 },
      { pinId: 4, arriveTime: '13:00', departTime: '13:20', estimatedCostPerPerson: 20 },
    ],
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /lunch block/.test(e)))
})

test('rejects stops that are out of chronological order', () => {
  const bad = {
    ...goodItinerary,
    stops: [
      { pinId: 1, arriveTime: '14:00', departTime: '15:00', estimatedCostPerPerson: 0 },
      { pinId: 2, arriveTime: '10:00', departTime: '11:00', estimatedCostPerPerson: 0 }, // earlier than prev
    ],
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /out of order/.test(e)))
})

test('rejects a stop outside the trip time window', () => {
  const bad = {
    ...goodItinerary,
    stops: [{ pinId: 1, arriveTime: '08:00', departTime: '08:30', estimatedCostPerPerson: 0 }], // before 09:00
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /outside the trip window/.test(e)))
})

test('rejects a mealType whose arriveTime is outside its block', () => {
  const bad = {
    ...goodItinerary,
    stops: [{ pinId: 3, arriveTime: '16:00', departTime: '16:30', estimatedCostPerPerson: 20, mealType: 'lunch' }],
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /outside that block/.test(e)))
})

test('rejects a malformed stop (bad time string) without crashing', () => {
  const bad = {
    ...goodItinerary,
    stops: [{ pinId: 1, arriveTime: '9am', departTime: '11:00', estimatedCostPerPerson: 0 }],
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /arriveTime/.test(e)))
})

test('skips window/budget checks gracefully when constraints are absent', () => {
  const { valid } = validateItinerary(goodItinerary, shortlist, {})
  assert.equal(valid, true) // no timeWindow/budget → those rules just don't run
})
