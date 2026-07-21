// Integration test for the full engine -> AI handoff: run the REAL
// recommendation engine (recommend()) to produce a shortlist + constraints,
// pipe that straight into the AI sequencing service (generateItinerary()), and
// assert the resulting day is well-formed, realistic, and high quality.
//
// Network-free by design: with no AI gateway key configured, generateItinerary
// catches the failed call and uses its deterministic fallback sequencer, which
// produces an itinerary in the exact same shape the AI would. So this test
// exercises the real contract between the two services on every run — it's the
// thing that catches "engine output the AI can't actually sequence".
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { recommend } from '../recommendation/recommend/recommend.js'
import { generateItinerary } from './index.js'
import { validateItinerary } from './validation/validate.js'
import { toMinutes } from '../recommendation/helpers/helpers.js'

// A compact but realistic SF-ish catalog: enough activities + restaurants,
// with coordinates, hours, prices, and diet/cuisine tags, so the engine has
// real signal and the sequencer has a real day to build.
// Activity pins match on `interests` (the engine reads pin.interests, not the
// legacy pin.tags). `tags` is kept for any code still displaying it.
const A = (id, name, tags, lat, lon, extra = {}) => ({
  id, name, category: 'activity', tags, interests: tags,
  pricePerPerson: 10, latitude: lat, longitude: lon,
  openingHours: [{ open: '09:00', close: '18:00' }], ...extra,
})
const R = (id, name, cuisine, lat, lon, extra = {}) => ({
  id, name, category: 'restaurant', tags: ['food'], cuisine,
  pricePerPerson: 20, latitude: lat, longitude: lon,
  openingHours: [{ open: '11:00', close: '21:00' }], ...extra,
})

const CATALOG = [
  A(1, 'SFMOMA', ['art', 'museum'], 37.7857, -122.4011, { rating: 4.6 }),
  A(2, 'Golden Gate Park', ['nature', 'park', 'outdoors'], 37.7694, -122.4562, { rating: 4.8, pricePerPerson: 0 }),
  A(3, 'de Young Museum', ['art', 'gallery'], 37.7715, -122.4686, { rating: 4.7 }),
  A(4, 'Coit Tower', ['scenic_views', 'landmark'], 37.8024, -122.4058, { rating: 4.5 }),
  A(5, 'Exploratorium', ['science', 'museum'], 37.8017, -122.3973, { rating: 4.7 }),
  R(10, 'La Taqueria', ['mexican'], 37.7509, -122.4180, { rating: 4.5, pricePerPerson: 14 }),
  R(11, 'Marufuku Ramen', ['ramen', 'japanese'], 37.7850, -122.4324, { rating: 4.6, pricePerPerson: 22 }),
  R(12, 'Tony\'s Pizza', ['italian', 'pizza'], 37.8000, -122.4090, { rating: 4.5, pricePerPerson: 28 }),
  R(13, 'Shizen Vegan Sushi', ['sushi', 'japanese'], 37.7670, -122.4220, { rating: 4.5, pricePerPerson: 35, diet: ['vegan', 'vegetarian'] }),
  R(14, 'Nopa', ['american'], 37.7748, -122.4376, { rating: 4.6, pricePerPerson: 42 }),
  R(15, 'Kokkari', ['greek', 'mediterranean'], 37.7975, -122.3999, { rating: 4.7, pricePerPerson: 55 }),
]

const MEMBERS = [
  { name: 'Ana', startLocation: { latitude: 37.7857, longitude: -122.4011 }, interestTags: ['art', 'museum'], foodPrefs: ['mexican'] },
  { name: 'Ben', startLocation: { latitude: 37.7694, longitude: -122.4562 }, interestTags: ['nature', 'scenic_views'], foodPrefs: ['ramen'], diet: ['vegan'] },
  { name: 'Cy', startLocation: { latitude: 37.8000, longitude: -122.4090 }, interestTags: ['science'], foodPrefs: ['italian'] },
]

const TRIP = { startTime: '09:00', endTime: '18:00', maxBudgetPerPerson: 90, groupSize: 3, travelRadius: 6, transport: 'walking' }

// Run the whole pipeline once and reuse it across assertions.
async function pipeline(trip = TRIP, members = MEMBERS, catalog = CATALOG) {
  const { shortlist, constraints } = recommend(trip, members, catalog)
  const out = await generateItinerary(shortlist, constraints)
  return { shortlist, constraints, out }
}

test('handoff: engine shortlist sequences into a feasible, valid itinerary', async () => {
  const { shortlist, constraints, out } = await pipeline()
  assert.ok(out.itinerary, 'expected an itinerary, not an infeasible result')
  const { valid, errors } = validateItinerary(out.itinerary, shortlist, constraints)
  assert.ok(valid, `itinerary should pass validation: ${errors.join('; ')}`)
})

test('handoff: every stop is a real place from the engine shortlist (no hallucinations)', async () => {
  const { shortlist, out } = await pipeline()
  const ids = new Set(shortlist.map((p) => p.id))
  for (const stop of out.itinerary.stops) {
    assert.ok(ids.has(stop.pinId), `stop pinId ${stop.pinId} is not in the shortlist`)
  }
})

test('handoff: stops are in chronological order and inside the trip window', async () => {
  const { out } = await pipeline()
  const stops = out.itinerary.stops
  const start = toMinutes(TRIP.startTime)
  const end = toMinutes(TRIP.endTime)
  let prevDepart = -Infinity
  for (const s of stops) {
    const arrive = toMinutes(s.arriveTime)
    const depart = toMinutes(s.departTime)
    assert.ok(arrive >= start && depart <= end, `${s.arriveTime}-${s.departTime} outside ${TRIP.startTime}-${TRIP.endTime}`)
    assert.ok(depart >= arrive, 'departs before it arrives')
    assert.ok(arrive >= prevDepart, 'overlaps the previous stop (out of order)')
    prevDepart = depart
  }
})

test('handoff: total per-person cost stays within budget', async () => {
  const { shortlist, out } = await pipeline()
  // Cost is a fact of the place — sum the chosen pins' prices, not the stops.
  const priceById = new Map(shortlist.map((p) => [p.id, p.pricePerPerson]))
  const total = out.itinerary.stops.reduce((sum, s) => sum + (priceById.get(s.pinId) ?? 0), 0)
  assert.ok(total <= TRIP.maxBudgetPerPerson, `total ${total} over budget`)
})

test('handoff: itinerary is substantive — multiple stops with a mix of activities and a meal', async () => {
  const { shortlist, out } = await pipeline()
  const stops = out.itinerary.stops
  assert.ok(stops.length >= 3, `expected a real day (≥3 stops), got ${stops.length}`)

  const byId = new Map(shortlist.map((p) => [p.id, p]))
  const cats = stops.map((s) => byId.get(s.pinId)?.category)
  assert.ok(cats.includes('restaurant'), 'a full day should include at least one meal stop')
  assert.ok(cats.includes('activity'), 'a full day should include at least one activity')
})

test('handoff: travel legs are present and realistic between stops', async () => {
  const { out } = await pipeline()
  const stops = out.itinerary.stops
  for (let i = 0; i < stops.length - 1; i++) {
    const t = stops[i].travelTimeToNextMinutes
    const d = stops[i].distanceToNextMeters
    assert.ok(typeof t === 'number' && t >= 0, `stop ${i} missing a travel-time estimate`)
    assert.ok(typeof d === 'number' && d >= 0, `stop ${i} missing a travel distance`)
  }
  // Last stop has no onward leg.
  assert.equal(stops.at(-1).travelTimeToNextMinutes ?? null, null)
})

test('handoff: walking trips allow more travel time than driving for the same plan', async () => {
  const walk = await pipeline({ ...TRIP, transport: 'walking' })
  const drive = await pipeline({ ...TRIP, transport: 'driving' })
  const legSum = (r) => r.out.itinerary.stops.reduce((s, x) => s + (x.travelTimeToNextMinutes ?? 0), 0)
  assert.ok(legSum(walk) >= legSum(drive), 'walking should not be faster than driving overall')
})

test('handoff: a vegan member still gets a restaurant they can eat at in the shortlist', async () => {
  // The engine guarantees diet coverage; confirm it survives into what the AI receives.
  const { shortlist } = await pipeline()
  const eatable = shortlist.filter(
    (p) => p.category === 'restaurant' && (!p.diet || p.diet.includes('vegan'))
  )
  assert.ok(eatable.length > 0, 'vegan Ben has no eatable restaurant in the handoff shortlist')
})

test('handoff: an impossibly tight trip surfaces cleanly (no crash, valid shape)', async () => {
  // Tiny radius around a lone member far from everything → thin/empty pool.
  const loner = [{ name: 'Solo', startLocation: { latitude: 37.70, longitude: -122.51 }, interestTags: ['art'], foodPrefs: [] }]
  const tight = { startTime: '09:00', endTime: '10:00', maxBudgetPerPerson: 5, groupSize: 1, travelRadius: 0.3 }
  const { out } = await pipeline(tight, loner)
  // Either a valid (small) itinerary or a clean infeasible result — never a throw.
  assert.ok(out.itinerary || out.feasible === false, 'expected an itinerary or a clean infeasible result')
})
