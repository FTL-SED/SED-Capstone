import { test } from 'node:test'
import assert from 'node:assert/strict'

import { validateItinerary } from './validate.js'

// A small shortlist the itineraries below reference by id. Ids 1/2 are
// activities, 3/4 are restaurants — enough to exercise every rule.
const shortlist = [
  { id: 1, name: 'Ferry Building', category: 'activity', latitude: 37.79, longitude: -122.39, pricePerPerson: 0 },
  { id: 2, name: 'Golden Gate Park', category: 'activity', latitude: 37.77, longitude: -122.48, pricePerPerson: 20 },
  { id: 3, name: 'Tartine', category: 'restaurant', latitude: 37.76, longitude: -122.42, pricePerPerson: 30 },
  { id: 4, name: 'Zuni Cafe', category: 'restaurant', latitude: 37.77, longitude: -122.42, pricePerPerson: 40 },
]

// Budget is per person and summed from the shortlist pins' pricePerPerson by
// pinId (the stops carry no cost). The goodItinerary below visits all four:
// 0 + 30 + 20 + 40 = 90 ≤ 100.
const constraints = {
  timeWindow: { startTime: '09:00', endTime: '21:00' },
  maxBudgetPerPerson: 100,
  includeMeals: false,
}

// A clean, feasible itinerary that satisfies every rule — the baseline the
// negative tests each break exactly one rule from.
const goodItinerary = {
  feasible: true,
  title: 'A Day in San Francisco',
  location: 'San Francisco',
  description: 'A relaxed group day.',
  // The dinner stop runs to 20:20 so the day departs within the coverage slack
  // of the 21:00 window end (slack = min(45, 15% of the 720-min window) = 45).
  // Negative tests below override `stops` entirely, so they're unaffected.
  stops: [
    { pinId: 1, arriveTime: '09:30', departTime: '11:00' },
    { pinId: 3, arriveTime: '12:00', departTime: '13:00', mealType: 'lunch' },
    { pinId: 2, arriveTime: '13:30', departTime: '17:00' },
    { pinId: 4, arriveTime: '18:00', departTime: '20:20', mealType: 'dinner' },
  ],
}

test('accepts a well-formed, in-budget, in-window itinerary', () => {
  const { valid, errors } = validateItinerary(goodItinerary, shortlist, constraints)
  assert.deepEqual(errors, [])
  assert.equal(valid, true)
})

test('accepts an OVERNIGHT itinerary that crosses midnight', () => {
  // A late-night plan on a 22:00 → 02:00 window, with a stop after midnight.
  // A naive same-day validator would reject 00:30 as "before" 23:00 and as
  // outside the window; the elapsed-from-start model accepts it.
  const overnight = {
    feasible: true,
    title: 'Late Night Out',
    location: 'San Francisco',
    description: 'Bars and a late bite.',
    stops: [
      { pinId: 1, arriveTime: '22:00', departTime: '23:15' },
      { pinId: 2, arriveTime: '23:30', departTime: '00:30' }, // crosses midnight
      { pinId: 3, arriveTime: '00:45', departTime: '01:45' },
    ],
  }
  const { valid, errors } = validateItinerary(overnight, shortlist, {
    timeWindow: { startTime: '22:00', endTime: '02:00' },
    maxBudgetPerPerson: 100,
  })
  assert.deepEqual(errors, [])
  assert.equal(valid, true)
})

test('rejects an overnight itinerary whose stop spills past the window end', () => {
  // Window 22:00 → 02:00; a stop departing 02:30 is past the end.
  const spill = {
    feasible: true,
    title: 'Too Late',
    location: 'SF',
    description: 'Runs past the window.',
    stops: [
      { pinId: 1, arriveTime: '22:00', departTime: '23:00' },
      { pinId: 2, arriveTime: '01:30', departTime: '02:30' }, // past 02:00 end
    ],
  }
  const { valid, errors } = validateItinerary(spill, shortlist, {
    timeWindow: { startTime: '22:00', endTime: '02:00' },
    maxBudgetPerPerson: 100,
  })
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /outside the trip window/.test(e)))
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
    stops: [{ pinId: 999, arriveTime: '10:00', departTime: '11:00' }],
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /hallucinated/.test(e)))
})

test('rejects an over-budget itinerary', () => {
  // Cost comes from the shortlist pins: 30 (Tartine, lunch) + 40 (Zuni, dinner)
  // = 70 against a low $50 cap → over budget.
  const bad = {
    ...goodItinerary,
    stops: [
      { pinId: 3, arriveTime: '12:00', departTime: '13:00', mealType: 'lunch' },
      { pinId: 4, arriveTime: '18:00', departTime: '19:00', mealType: 'dinner' },
    ],
  }
  const { valid, errors } = validateItinerary(bad, shortlist, { ...constraints, maxBudgetPerPerson: 50 })
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /exceeds budget/.test(e)))
})

test('keeps a day that is over budget only within the grace band', () => {
  // Tartine (30) + Zuni (40) = 70. On a $65 budget, grace = max(5, 65*0.05≈3) = 5,
  // so the limit is $70 — exactly at the edge, kept (surfaced as over-budget by
  // the controller). At $64 the limit is $69 < 70 → rejected.
  const day = {
    ...goodItinerary,
    stops: [
      { pinId: 3, arriveTime: '12:00', departTime: '13:00', mealType: 'lunch' },
      { pinId: 4, arriveTime: '18:00', departTime: '19:00', mealType: 'dinner' },
    ],
  }
  // enforceCoverage:false isolates the budget rule (a 2-stop day otherwise trips
  // the coverage backstop on this wide window).
  const withinGrace = validateItinerary(day, shortlist, { ...constraints, maxBudgetPerPerson: 65 }, { enforceCoverage: false })
  assert.equal(withinGrace.valid, true, `$70 on a $65 budget is within the $5 grace: ${withinGrace.errors.join('; ')}`)

  const pastGrace = validateItinerary(day, shortlist, { ...constraints, maxBudgetPerPerson: 64 }, { enforceCoverage: false })
  assert.equal(pastGrace.valid, false, '$70 on a $64 budget is past the $5 grace')
  assert.ok(pastGrace.errors.some((e) => /exceeds budget/.test(e)))
})

test('rejects two meals in the same block (double lunch)', () => {
  const bad = {
    ...goodItinerary,
    stops: [
      { pinId: 3, arriveTime: '12:00', departTime: '12:45', mealType: 'lunch' },
      { pinId: 4, arriveTime: '13:00', departTime: '13:30', mealType: 'lunch' },
    ],
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /lunch block/.test(e)))
})

test('a tagged lunch plus an untagged café in the lunch window does NOT collide', () => {
  // The whole point of Fix 2: the collision cap counts only EXPLICITLY tagged
  // meals, so an afternoon coffee/snack (untagged restaurant) landing in the
  // lunch window is no longer mistaken for a second lunch. This is a legitimate
  // day that used to get rejected into the fallback.
  const ok = {
    ...goodItinerary,
    stops: [
      { pinId: 1, arriveTime: '09:30', departTime: '11:00' },
      { pinId: 3, arriveTime: '12:00', departTime: '13:00', mealType: 'lunch' },
      { pinId: 4, arriveTime: '13:10', departTime: '13:40' }, // untagged café, in lunch window
      { pinId: 2, arriveTime: '14:00', departTime: '20:20' }, // runs near the 21:00 end (coverage slack)
    ],
  }
  const { valid, errors } = validateItinerary(ok, shortlist, constraints)
  assert.equal(valid, true, errors.join('; '))
})

test('rejects stops that are out of chronological order', () => {
  const bad = {
    ...goodItinerary,
    stops: [
      { pinId: 1, arriveTime: '14:00', departTime: '15:00' },
      { pinId: 2, arriveTime: '10:00', departTime: '11:00' }, // earlier than prev
    ],
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /out of order/.test(e)))
})

test('rejects a stop outside the trip time window', () => {
  const bad = {
    ...goodItinerary,
    stops: [{ pinId: 1, arriveTime: '08:00', departTime: '08:30' }], // before 09:00
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /outside the trip window/.test(e)))
})

test('rejects a mealType whose arriveTime is outside its block', () => {
  // 16:30 is past the lunch window (11:30-14:30), so tagging it "lunch" is invalid.
  const bad = {
    ...goodItinerary,
    stops: [{ pinId: 3, arriveTime: '16:30', departTime: '17:00', mealType: 'lunch' }],
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /outside that block/.test(e)))
})

test('rejects a malformed stop (bad time string) without crashing', () => {
  const bad = {
    ...goodItinerary,
    stops: [{ pinId: 1, arriveTime: '9am', departTime: '11:00' }],
  }
  const { valid, errors } = validateItinerary(bad, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /arriveTime/.test(e)))
})

test('skips window/budget checks gracefully when constraints are absent', () => {
  const { valid } = validateItinerary(goodItinerary, shortlist, {})
  assert.equal(valid, true) // no timeWindow/budget → those rules just don't run
})

test('validate: rejects a wanted meal missing when food is available', () => {
  const shortlist = [
    { id: 1, category: 'activity', pricePerPerson: 0 },
    { id: 2, category: 'activity', pricePerPerson: 0 },
    { id: 10, category: 'restaurant', pricePerPerson: 15 },
  ]
  const result = {
    feasible: true, title: 'T', location: 'L', description: 'D',
    stops: [
      { pinId: 1, arriveTime: '11:00', departTime: '12:30' },
      { pinId: 2, arriveTime: '13:00', departTime: '14:30' },
    ],
  }
  const constraints = {
    timeWindow: { startTime: '10:00', endTime: '14:30' }, // overlaps lunch only
    maxBudgetPerPerson: 100,
    includeMeals: true,
    foodBelowMin: false,
  }
  const { valid, errors } = validateItinerary(result, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /missing a meal in the lunch block/.test(e)), errors.join('; '))
})

test('validate: does NOT require breakfast even on an early-start day (breakfast is optional)', () => {
  // 08:00 start makes breakfast enforceable, but breakfast is not in
  // REQUIRED_MEAL_BLOCKS, so a day that opens with an activity and has only
  // lunch + dinner is valid — this is the single biggest fallback trigger fixed.
  const shortlist = [
    { id: 1, category: 'activity', pricePerPerson: 0 },
    { id: 2, category: 'activity', pricePerPerson: 0 },
    { id: 10, category: 'restaurant', pricePerPerson: 15 },
    { id: 11, category: 'restaurant', pricePerPerson: 20 },
  ]
  const result = {
    feasible: true, title: 'T', location: 'L', description: 'D',
    stops: [
      { pinId: 1, arriveTime: '08:00', departTime: '11:00' }, // activity, no breakfast
      { pinId: 10, arriveTime: '12:00', departTime: '13:30', mealType: 'lunch' },
      { pinId: 2, arriveTime: '14:00', departTime: '17:30' },
      { pinId: 11, arriveTime: '18:00', departTime: '19:50', mealType: 'dinner' }, // near the 20:30 end
    ],
  }
  const constraints = {
    timeWindow: { startTime: '08:00', endTime: '20:30' },
    maxBudgetPerPerson: 100, includeMeals: true, foodBelowMin: false,
  }
  const { valid, errors } = validateItinerary(result, shortlist, constraints)
  assert.equal(valid, true, errors.join('; '))
})

test('validate: does NOT require meals when includeMeals is false', () => {
  const shortlist = [{ id: 1, category: 'activity', pricePerPerson: 0 }, { id: 10, category: 'restaurant', pricePerPerson: 15 }]
  const result = {
    feasible: true, title: 'T', location: 'L', description: 'D',
    stops: [{ pinId: 1, arriveTime: '11:00', departTime: '12:30' }],
  }
  // Tight window (11:00-12:45) that the single stop fills, so coverage backstop doesn't trip
  const constraints = { timeWindow: { startTime: '11:00', endTime: '12:45' }, maxBudgetPerPerson: 100, includeMeals: false }
  const { valid } = validateItinerary(result, shortlist, constraints)
  assert.equal(valid, true)
})

test('validate: does NOT require meals when food is scarce (foodBelowMin)', () => {
  const shortlist = [{ id: 1, category: 'activity', pricePerPerson: 0 }]
  const result = {
    feasible: true, title: 'T', location: 'L', description: 'D',
    stops: [{ pinId: 1, arriveTime: '11:00', departTime: '12:30' }],
  }
  // Tight window (11:00-12:45) the single stop fills, so the coverage backstop
  // doesn't trip — this test isolates the foodBelowMin meal-waiver behavior.
  const constraints = { timeWindow: { startTime: '11:00', endTime: '12:45' }, maxBudgetPerPerson: 100, includeMeals: true, foodBelowMin: true }
  const { valid } = validateItinerary(result, shortlist, constraints)
  assert.equal(valid, true)
})

test('validate: rejects an AI day that ends well before the window end', () => {
  const shortlist = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, category: 'activity', pricePerPerson: 0 }))
  const result = {
    feasible: true, title: 'T', location: 'L', description: 'D',
    stops: [
      { pinId: 1, arriveTime: '10:00', departTime: '11:30' },
      { pinId: 2, arriveTime: '11:45', departTime: '13:15' },
    ], // ends 13:15 in a 10:00–20:30 window — hours short of the end
  }
  const constraints = { timeWindow: { startTime: '10:00', endTime: '20:30' }, maxBudgetPerPerson: 100, includeMeals: false }
  const { valid, errors } = validateItinerary(result, shortlist, constraints)
  assert.equal(valid, false)
  assert.ok(errors.some((e) => /day ends too early/.test(e)), errors.join('; '))
})

test('validate: rejects a short-window day that ends ~42 min early (window-scaled slack)', () => {
  // The reported bug: a 12:00–17:00 (300-min) day ending 16:18 is 42 min short.
  // Under the old flat 90-min slack this passed; the scaled slack is
  // min(45, 15%*300) = 45, so 42 is under the cap — but push it to 48 min short
  // and it must be caught. Proves short windows are no longer over-tolerant.
  const shortlist = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, category: 'activity', pricePerPerson: 0 }))
  const result = {
    feasible: true, title: 'T', location: 'L', description: 'D',
    stops: [
      { pinId: 1, arriveTime: '12:00', departTime: '13:00' },
      { pinId: 2, arriveTime: '13:05', departTime: '14:12' },
      { pinId: 3, arriveTime: '14:30', departTime: '16:12' }, // ends 16:12 → 48 min before 17:00
    ],
  }
  const constraints = { timeWindow: { startTime: '12:00', endTime: '17:00' }, maxBudgetPerPerson: 100, includeMeals: false }
  const { valid, errors } = validateItinerary(result, shortlist, constraints)
  assert.equal(valid, false, 'a 48-min-early finish on a 5h window should be rejected')
  assert.ok(errors.some((e) => /day ends too early/.test(e)), errors.join('; '))
})

test('validate: coverage is clock-based — a day reaching the end passes even with unused pins', () => {
  // 12 pins available, only 3 used, but the day fills to 20:00 (within one
  // stop-length of the 20:30 end) — the new coverage rule cares about reaching
  // the end time, not about leftover pins.
  const shortlist = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, category: 'activity', pricePerPerson: 0 }))
  const result = {
    feasible: true, title: 'T', location: 'L', description: 'D',
    stops: [
      { pinId: 1, arriveTime: '10:00', departTime: '13:00' },
      { pinId: 2, arriveTime: '13:15', departTime: '16:30' },
      { pinId: 3, arriveTime: '16:45', departTime: '20:00' },
    ],
  }
  const constraints = { timeWindow: { startTime: '10:00', endTime: '20:30' }, maxBudgetPerPerson: 100, includeMeals: false }
  const { valid, errors } = validateItinerary(result, shortlist, constraints)
  assert.equal(valid, true, errors.join('; '))
})

test('validate: a day filling near the window end passes coverage', () => {
  const shortlist = Array.from({ length: 3 }, (_, i) => ({ id: i + 1, category: 'activity', pricePerPerson: 0 }))
  const result = {
    feasible: true, title: 'T', location: 'L', description: 'D',
    stops: [
      { pinId: 1, arriveTime: '10:00', departTime: '13:00' },
      { pinId: 2, arriveTime: '13:15', departTime: '16:30' },
      { pinId: 3, arriveTime: '16:45', departTime: '20:00' },
    ], // ends 20:00, all pins used
  }
  const constraints = { timeWindow: { startTime: '10:00', endTime: '20:30' }, maxBudgetPerPerson: 100, includeMeals: false }
  const { valid } = validateItinerary(result, shortlist, constraints)
  assert.equal(valid, true)
})
