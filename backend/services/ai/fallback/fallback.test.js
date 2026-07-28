import { test } from 'node:test'
import assert from 'node:assert/strict'

import { fallbackSequence, nearestNeighborOrder } from './fallback.js'
import { rescheduleStops } from './schedule.js'
import { validateItinerary } from '../validation/validate.js'
import { windowLengthMinutes } from '../../../utils/time.js'

// Mirror services/ai/index.js optimizeItinerary: fallbackSequence no longer
// fills the window itself (that would double-stretch); the single fill pass runs
// here, on both AI and fallback output. Tests that assert FILLED behavior route
// the fallback's stops through this, exactly as production does.
const fillWindow = (result, shortlist, startTime, endTime, transport) => {
  const coordById = new Map(shortlist.map((p) => [p.id, { latitude: p.latitude, longitude: p.longitude }]))
  const coordOf = (stop) => coordById.get(stop.pinId)
  const stops = rescheduleStops(result.stops, coordOf, startTime, transport, {
    windowEndElapsed: windowLengthMinutes(startTime, endTime),
  })
  return { ...result, stops }
}

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
  includeMeals: false,
}

test('produces a feasible itinerary that PASSES validation (same-schema promise)', () => {
  const result = fallbackSequence(shortlist, constraints)
  assert.equal(result.feasible, true)
  // Validate the fallback the way generateItinerary does — enforceCoverage:false.
  // The fallback is greedy-maximal: with a thin 5-pin shortlist it legitimately
  // can't reach the 21:00 window end, so the clock-based coverage backstop is
  // exempted for fallback output (C2). It must still obey every other rule.
  const { valid, errors } = validateItinerary(result, shortlist, constraints, { enforceCoverage: false })
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
  const tight = { ...constraints, maxBudgetPerPerson: 30, includeMeals: false } // cap = 30/person
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

test('seats free activities even when pricey ones are unaffordable and meals are pending', () => {
  // Regression for the tight-budget under-fill: an expensive activity early in
  // nearest-neighbor order used to STALL the queue while meals were pending
  // (the "skip over-budget activity" branch only fired when no meal was left),
  // so the free activities behind it never got placed → a 2-meal, no-activity
  // day. With a $40 budget, the day should still pack the free activities.
  const shortlist = [
    { id: 1, name: 'Pricey A', category: 'activity', latitude: 37.79, longitude: -122.40, pricePerPerson: 500, address: 'SF' },
    { id: 2, name: 'Free A', category: 'activity', latitude: 37.78, longitude: -122.41, pricePerPerson: 0, address: 'SF' },
    { id: 3, name: 'Free B', category: 'activity', latitude: 37.77, longitude: -122.42, pricePerPerson: 0, address: 'SF' },
    { id: 4, name: 'Free C', category: 'activity', latitude: 37.76, longitude: -122.43, pricePerPerson: 0, address: 'SF' },
    { id: 10, name: 'Cheap Lunch', category: 'restaurant', latitude: 37.775, longitude: -122.415, pricePerPerson: 14, rating: 4.5, address: 'SF' },
    { id: 11, name: 'Cheap Dinner', category: 'restaurant', latitude: 37.765, longitude: -122.425, pricePerPerson: 8, rating: 4.4, address: 'SF' },
  ]
  const cons = { timeWindow: { startTime: '10:00', endTime: '20:00' }, maxBudgetPerPerson: 40, groupSize: 2, includeMeals: true, foodBelowMin: false }
  const result = fallbackSequence(shortlist, cons)
  assert.equal(result.feasible, true)
  // The free activities must be seated (before the fix, ZERO were — the pricey
  // pin stalled the queue). Exact count can vary as window-fill stretches dwell
  // times, so assert "at least two got in", not a hardcoded number.
  const activityStops = result.stops.filter((s) => [2, 3, 4].includes(s.pinId))
  assert.ok(activityStops.length >= 2, `expected free activities seated, got ${activityStops.length}`)
  assert.ok(!result.stops.some((s) => s.pinId === 1), 'pricey activity should be skipped')
  const priceById = new Map(shortlist.map((p) => [p.id, p.pricePerPerson]))
  const total = result.stops.reduce((s, x) => s + (priceById.get(x.pinId) ?? 0), 0)
  assert.ok(total <= 40, `total ${total} exceeds budget 40`)
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
    { id: 1, name: 'Museum', category: 'activity', pricePerPerson: 20, latitude: 37.785, longitude: -122.401, rating: 4.6, address: 'San Francisco' },
    { id: 2, name: 'Park', category: 'activity', pricePerPerson: 0, latitude: 37.769, longitude: -122.456, rating: 4.8, address: 'San Francisco' },
    { id: 3, name: 'Viewpoint', category: 'activity', pricePerPerson: 0, latitude: 37.802, longitude: -122.405, rating: 4.5, address: 'San Francisco' },
    { id: 10, name: 'Taqueria', category: 'restaurant', pricePerPerson: 14, latitude: 37.751, longitude: -122.418, rating: 4.5, address: 'San Francisco' },
    { id: 11, name: 'Ramen', category: 'restaurant', pricePerPerson: 22, latitude: 37.785, longitude: -122.432, rating: 4.7, address: 'San Francisco' },
    { id: 12, name: 'Cafe', category: 'restaurant', pricePerPerson: 12, latitude: 37.775, longitude: -122.420, rating: 4.4, address: 'San Francisco' },
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

test('fallback: 08:00-start full-day trip reserves lunch and dinner but NOT breakfast', () => {
  // Breakfast is deliberately never auto-reserved (REQUIRED_MEAL_BLOCKS =
  // lunch/dinner) — a group day opens with an activity, not a forced sit-down
  // breakfast. Even an 08:00 start, where breakfast IS enforceable, gets only
  // lunch + dinner.
  const shortlist = [
    { id: 1, name: 'Museum', category: 'activity', pricePerPerson: 20, latitude: 37.785, longitude: -122.401, rating: 4.6, address: 'San Francisco' },
    { id: 2, name: 'Park', category: 'activity', pricePerPerson: 0, latitude: 37.769, longitude: -122.456, rating: 4.8, address: 'San Francisco' },
    { id: 10, name: 'Breakfast Spot', category: 'restaurant', pricePerPerson: 18, latitude: 37.795, longitude: -122.394, rating: 4.6, address: 'San Francisco' },
    { id: 11, name: 'Taqueria', category: 'restaurant', pricePerPerson: 14, latitude: 37.751, longitude: -122.418, rating: 4.5, address: 'San Francisco' },
    { id: 12, name: 'Ramen', category: 'restaurant', pricePerPerson: 22, latitude: 37.785, longitude: -122.432, rating: 4.7, address: 'San Francisco' },
  ]
  const constraints = {
    timeWindow: { startTime: '08:00', endTime: '20:30' },
    maxBudgetPerPerson: 120,
    transport: 'driving',
    includeMeals: true,
    foodBelowMin: false,
  }
  const result = fallbackSequence(shortlist, constraints)
  assert.equal(result.feasible, true)
  const mealTypes = new Set(result.stops.filter((s) => s.mealType).map((s) => s.mealType))
  assert.ok(!mealTypes.has('breakfast'), 'should NOT auto-reserve breakfast')
  assert.ok(mealTypes.has('lunch'), 'expected a lunch meal')
  assert.ok(mealTypes.has('dinner'), 'expected a dinner meal')
})

test('fallback: 11:30-start trip does NOT include breakfast (block no longer overlaps)', () => {
  const shortlist = [
    { id: 1, name: 'Museum', category: 'activity', pricePerPerson: 20, latitude: 37.785, longitude: -122.401, rating: 4.6, address: 'San Francisco' },
    { id: 2, name: 'Park', category: 'activity', pricePerPerson: 0, latitude: 37.769, longitude: -122.456, rating: 4.8, address: 'San Francisco' },
    { id: 10, name: 'Breakfast Spot', category: 'restaurant', pricePerPerson: 18, latitude: 37.795, longitude: -122.394, rating: 4.6, address: 'San Francisco' },
    { id: 11, name: 'Taqueria', category: 'restaurant', pricePerPerson: 14, latitude: 37.751, longitude: -122.418, rating: 4.5, address: 'San Francisco' },
    { id: 12, name: 'Ramen', category: 'restaurant', pricePerPerson: 22, latitude: 37.785, longitude: -122.432, rating: 4.7, address: 'San Francisco' },
  ]
  const constraints = {
    timeWindow: { startTime: '11:30', endTime: '20:30' },
    maxBudgetPerPerson: 120,
    transport: 'driving',
    includeMeals: true,
    foodBelowMin: false,
  }
  const result = fallbackSequence(shortlist, constraints)
  assert.equal(result.feasible, true)
  const mealTypes = new Set(result.stops.filter((s) => s.mealType).map((s) => s.mealType))
  assert.ok(!mealTypes.has('breakfast'), 'should NOT have breakfast (block 07:00-10:45 does not overlap 11:30-20:30)')
  // Should still have lunch and dinner
  assert.ok(mealTypes.has('lunch'), 'expected a lunch meal')
  assert.ok(mealTypes.has('dinner'), 'expected a dinner meal')
})

test('fallback meals respect budget cap (picks best-rated within cumulative budget)', () => {
  // Two enforceable blocks (lunch + dinner) with restaurants available. The
  // top-RATED pair ($30 + $28 = $58) exceeds budget, but greedily picking the
  // best-rated per block that keeps the running total within budget produces a
  // valid in-budget combination. Fallback picks Pricey Lunch ($30, 4.9★) first,
  // then must downgrade dinner to Affordable Dinner ($18, 4.6★) to stay under $50.
  const shortlist = [
    { id: 1, name: 'Museum', category: 'activity', pricePerPerson: 5, latitude: 37.785, longitude: -122.401, rating: 4.6, address: 'SF' },
    { id: 2, name: 'Park', category: 'activity', pricePerPerson: 0, latitude: 37.769, longitude: -122.456, rating: 4.8, address: 'SF' },
    { id: 10, name: 'Pricey Lunch', category: 'restaurant', pricePerPerson: 30, latitude: 37.795, longitude: -122.394, rating: 4.9, address: 'SF' },
    { id: 11, name: 'Affordable Lunch', category: 'restaurant', pricePerPerson: 22, latitude: 37.751, longitude: -122.418, rating: 4.7, address: 'SF' },
    { id: 12, name: 'Pricey Dinner', category: 'restaurant', pricePerPerson: 28, latitude: 37.785, longitude: -122.432, rating: 4.8, address: 'SF' },
    { id: 13, name: 'Affordable Dinner', category: 'restaurant', pricePerPerson: 18, latitude: 37.775, longitude: -122.420, rating: 4.6, address: 'SF' },
  ]
  const constraints = {
    timeWindow: { startTime: '10:00', endTime: '20:30' },
    maxBudgetPerPerson: 50,
    transport: 'driving',
    includeMeals: true,
    foodBelowMin: false,
  }
  const result = fallbackSequence(shortlist, constraints)
  assert.equal(result.feasible, true)
  // Total per-person cost must not exceed budget
  const priceById = new Map(shortlist.map((p) => [p.id, p.pricePerPerson]))
  const total = result.stops.reduce((s, x) => s + (priceById.get(x.pinId) ?? 0), 0)
  assert.ok(total <= 50, `total ${total} exceeds cap 50`)
  // Greedy picks the highest-rated lunch (Pricey Lunch), then must pick Affordable Dinner
  const usedIds = new Set(result.stops.map((s) => s.pinId))
  assert.ok(usedIds.has(10), 'should pick Pricey Lunch (best-rated, fits budget)')
  assert.ok(!usedIds.has(12), 'should NOT pick Pricey Dinner (would exceed budget with Pricey Lunch)')
  assert.ok(usedIds.has(13), 'should pick Affordable Dinner (keeps total under cap)')
  // Should still seat both meals
  const mealTypes = new Set(result.stops.filter((s) => s.mealType).map((s) => s.mealType))
  assert.ok(mealTypes.has('lunch'), 'expected a lunch meal')
  assert.ok(mealTypes.has('dinner'), 'expected a dinner meal')
})

test('fallback reserves budget for ALL required meals (does not blow it on one pricey meal)', () => {
  // Regression for the low-budget throw: with a $25 cap and both lunch+dinner
  // required (and affordable as a set: $8+$8), the greedy per-block picker used
  // to grab the best-rated lunch ($25, using the whole budget) and then seat NO
  // dinner — which the validator requires, so generateItinerary threw. The
  // reservation must keep enough for the remaining required blocks, so it picks
  // a cheap lunch AND a cheap dinner.
  const shortlist = [
    { id: 1, name: 'Park', category: 'activity', pricePerPerson: 0, latitude: 37.769, longitude: -122.456, rating: 4.8, address: 'SF' },
    { id: 10, name: 'Pricey Spot', category: 'restaurant', pricePerPerson: 25, latitude: 37.795, longitude: -122.394, rating: 4.9, address: 'SF' },
    { id: 11, name: 'Cheap Lunch', category: 'restaurant', pricePerPerson: 8, latitude: 37.751, longitude: -122.418, rating: 4.4, address: 'SF' },
    { id: 12, name: 'Cheap Dinner', category: 'restaurant', pricePerPerson: 8, latitude: 37.785, longitude: -122.432, rating: 4.3, address: 'SF' },
  ]
  const constraints = {
    timeWindow: { startTime: '10:00', endTime: '20:30' },
    maxBudgetPerPerson: 25, includeMeals: true, foodBelowMin: false,
  }
  const result = fallbackSequence(shortlist, constraints)
  assert.equal(result.feasible, true)
  const mealTypes = new Set(result.stops.filter((s) => s.mealType).map((s) => s.mealType))
  assert.ok(mealTypes.has('lunch'), 'expected a lunch meal')
  assert.ok(mealTypes.has('dinner'), 'expected a dinner meal (must not be starved by a pricey lunch)')
  const priceById = new Map(shortlist.map((p) => [p.id, p.pricePerPerson]))
  const total = result.stops.reduce((s, x) => s + (priceById.get(x.pinId) ?? 0), 0)
  assert.ok(total <= 25, `total ${total} exceeds cap 25`)
})

const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))

test('fallback gives different venue types different dwell (not a flat 90)', () => {
  // A café and a museum shouldn't get identical dwell. On a TIGHT window (no
  // room for the fill pass to stretch anything), the natural per-type durations
  // show through: the café's dwell must be shorter than the museum's. (Exact
  // minutes are unit-tested on stopDurationFor in config/ai.test.js; here we just
  // prove the fallback applies per-type dwell rather than a constant.)
  const shortlist = [
    { id: 1, name: 'Blue Bottle', category: 'activity', interests: ['coffee'], pricePerPerson: 0, latitude: 37.780, longitude: -122.410, address: 'SF' },
    { id: 2, name: 'de Young', category: 'activity', interests: ['museum'], pricePerPerson: 0, latitude: 37.781, longitude: -122.411, address: 'SF' },
  ]
  // 165 min ≈ café 45 + museum 120 (+ tiny travel), so fill has ~nothing to add.
  const cons = { timeWindow: { startTime: '10:00', endTime: '12:45' }, maxBudgetPerPerson: 100, groupSize: 1, includeMeals: false }
  const result = fallbackSequence(shortlist, cons)
  const dur = (id) => {
    const s = result.stops.find((x) => x.pinId === id)
    return s ? toMin(s.departTime) - toMin(s.arriveTime) : null
  }
  assert.ok(dur(1) < dur(2), `café (${dur(1)}) should be shorter than museum (${dur(2)})`)
})

// --- Window fill: stretch dwell times so a thin shortlist still fills the day ---


test('fallback: thin shortlist stretches dwell times (bounded) toward the window end', () => {
  // 5 places for a 12-hour window. Each stop stretches only up to baseline +
  // STOP_STRETCH_MAX_MIN (activities 60+30=90, meals stay 90), so 5 pins can't
  // fully reach 21:00 — that's intentional: cap the stretch, don't inflate one
  // stop to 3 hours. The day should still push MUCH later than the un-stretched
  // ~15:00, and no single stop may exceed its cap.
  const shortlist = [
    { id: 1, name: 'Museum', category: 'activity', pricePerPerson: 0, latitude: 37.785, longitude: -122.401, rating: 4.6, address: 'San Francisco' },
    { id: 2, name: 'Park', category: 'activity', pricePerPerson: 0, latitude: 37.769, longitude: -122.456, rating: 4.8, address: 'San Francisco' },
    { id: 3, name: 'Garden', category: 'activity', pricePerPerson: 0, latitude: 37.77, longitude: -122.47, rating: 4.6, address: 'San Francisco' },
    { id: 10, name: 'Taqueria', category: 'restaurant', pricePerPerson: 14, latitude: 37.751, longitude: -122.418, rating: 4.5, address: 'San Francisco' },
    { id: 11, name: 'Ramen', category: 'restaurant', pricePerPerson: 22, latitude: 37.785, longitude: -122.432, rating: 4.7, address: 'San Francisco' },
  ]
  const constraints = {
    timeWindow: { startTime: '09:00', endTime: '21:00' },
    maxBudgetPerPerson: 400, groupSize: 2, includeMeals: true, foodBelowMin: false,
  }
  const seq = fallbackSequence(shortlist, constraints)
  assert.equal(seq.feasible, true)
  const seqLast = toMin(seq.stops[seq.stops.length - 1].departTime)
  // Fill as production does, then confirm it stretched the day LATER...
  const result = fillWindow(seq, shortlist, '09:00', '21:00', 'driving')
  const last = result.stops[result.stops.length - 1]
  assert.ok(toMin(last.departTime) >= seqLast, `fill should not shorten the day`)
  assert.ok(toMin(last.departTime) >= 18 * 60, `filled day should reach past 18:00, ended ${last.departTime}`)
  // ...but no single non-meal stop exceeds its per-type baseline + 30 cap.
  // (baselines here: activities 60 → cap 90; meals stay at 90.)
  for (const s of result.stops) {
    if (s.mealType) continue
    assert.ok(toMin(s.departTime) - toMin(s.arriveTime) <= 90, `stop dwell exceeds 60+30 cap`)
  }
  const { valid, errors } = validateItinerary(result, shortlist, constraints, { enforceCoverage: false })
  assert.deepEqual(errors, [])
  assert.equal(valid, true)
})

test('fallback: fill leaves no large interior idle gap before an anchored meal', () => {
  // A dinner anchored at 18:00 with few earlier places used to leave a big
  // idle hole in the afternoon; the fill pass grows the preceding stops so the
  // gap between one stop departing and the next arriving is just travel time.
  // Enough activities that fill has real material to close the afternoon hole
  // before the anchored dinner (a thin shortlist would leave an unavoidable hold
  // gap, which isn't a fill bug).
  const shortlist = [
    { id: 1, name: 'A1', category: 'activity', pricePerPerson: 0, latitude: 37.79, longitude: -122.40, rating: 4.5, address: 'San Francisco' },
    { id: 2, name: 'A2', category: 'activity', pricePerPerson: 0, latitude: 37.77, longitude: -122.42, rating: 4.5, address: 'San Francisco' },
    { id: 3, name: 'A3', category: 'activity', pricePerPerson: 0, latitude: 37.76, longitude: -122.43, rating: 4.5, address: 'San Francisco' },
    { id: 4, name: 'A4', category: 'activity', pricePerPerson: 0, latitude: 37.78, longitude: -122.44, rating: 4.5, address: 'San Francisco' },
    { id: 5, name: 'A5', category: 'activity', pricePerPerson: 0, latitude: 37.79, longitude: -122.45, rating: 4.5, address: 'San Francisco' },
    { id: 6, name: 'A6', category: 'activity', pricePerPerson: 0, latitude: 37.80, longitude: -122.41, rating: 4.5, address: 'San Francisco' },
    { id: 10, name: 'Lunch', category: 'restaurant', pricePerPerson: 15, latitude: 37.78, longitude: -122.41, rating: 4.5, address: 'San Francisco' },
    { id: 11, name: 'Dinner', category: 'restaurant', pricePerPerson: 20, latitude: 37.77, longitude: -122.43, rating: 4.5, address: 'San Francisco' },
  ]
  const constraints = {
    timeWindow: { startTime: '09:00', endTime: '21:00' },
    maxBudgetPerPerson: 400, groupSize: 2, includeMeals: true, foodBelowMin: false,
  }
  const seq = fallbackSequence(shortlist, constraints)
  assert.equal(seq.feasible, true)
  // Fill as production does (optimizeItinerary), then check for idle holes.
  const result = fillWindow(seq, shortlist, '09:00', '21:00', 'driving')
  const stops = result.stops
  for (let i = 1; i < stops.length; i++) {
    const gap = toMin(stops[i].arriveTime) - toMin(stops[i - 1].departTime)
    const travel = stops[i - 1].travelTimeToNextMinutes ?? 0
    // Idle time beyond travel should be small (allow slack for a meal held to
    // its block open time, but never a multi-hour hole).
    assert.ok(gap - travel <= 90, `gap of ${gap}min (travel ${travel}) before stop ${i} at ${stops[i].arriveTime}`)
  }
})

test('fallback: a stretched dwell never exceeds MAX_STOP_DURATION_MIN', () => {
  const shortlist = [
    { id: 1, name: 'Solo', category: 'activity', pricePerPerson: 0, latitude: 37.78, longitude: -122.41, rating: 4.5, address: 'San Francisco' },
  ]
  const constraints = {
    timeWindow: { startTime: '09:00', endTime: '21:00' },
    maxBudgetPerPerson: 400, groupSize: 2, includeMeals: false,
  }
  const result = fallbackSequence(shortlist, constraints)
  assert.equal(result.feasible, true)
  for (const s of result.stops) {
    const dwell = toMin(s.departTime) - toMin(s.arriveTime)
    assert.ok(dwell <= 180, `dwell ${dwell} exceeds cap`)
  }
})
