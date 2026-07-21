import { test } from 'node:test'
import assert from 'node:assert/strict'

import { hardFilter } from './filters.js'

// A group that likes art + coffee, one vegan member, a generous budget and a
// wide daytime window — the baseline most tests tweak one pin against.
const members = [
  { name: 'A', interestTags: ['art', 'museum'], foodPrefs: ['sushi'], diet: ['vegan'] },
  { name: 'B', interestTags: ['coffee'], foodPrefs: ['ramen'] },
]
const trip = { startTime: '09:00', endTime: '18:00', maxBudgetPerPerson: 60 }

const run = (pins) => hardFilter(pins, members, trip)

test('keeps an activity that overlaps a group interest', () => {
  const { candidates } = run([{ name: 'MoMA', category: 'museum', interests: ['art'] }])
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].name, 'MoMA')
})

test('drops an activity with zero interest overlap (pure noise)', () => {
  const { candidates } = run([{ name: 'Skate Park', category: 'park', interests: ['skating'] }])
  assert.equal(candidates.length, 0)
})

test('restaurants are always eligible even without an interest tag overlap', () => {
  const { candidates } = run([
    { name: 'Ramen Bar', category: 'restaurant', cuisine: ['ramen'], diet: [] },
  ])
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].name, 'Ramen Bar')
})

test('keeps a restaurant that can serve at least one member (B has no diet)', () => {
  // New rule: drop only if the restaurant can serve NOBODY. B has no diet, so a
  // vegetarian-only steakhouse still works for B even though vegan A can't eat there.
  const { candidates } = run([
    { name: 'Steakhouse', category: 'restaurant', cuisine: ['steak'], diet: ['vegetarian'] },
  ])
  assert.equal(candidates.length, 1)
})

test('drops a restaurant that can serve no member in the group', () => {
  // A group where every member has a diet the restaurant cannot serve.
  const strictMembers = [
    { name: 'A', interestTags: [], foodPrefs: [], diet: ['vegan'] },
    { name: 'B', interestTags: [], foodPrefs: [], diet: ['halal'] },
  ]
  const { candidates } = hardFilter(
    [{ name: 'Pork Palace', category: 'restaurant', cuisine: ['pork'], diet: ['none'] }],
    strictMembers,
    trip
  )
  assert.equal(candidates.length, 0)
})

test('drops a pin whose per-person price alone exceeds the budget', () => {
  const { candidates } = run([
    { name: 'Fancy Tasting', category: 'restaurant', cuisine: ['fusion'], priceLevel: 4 }, // $80 > $60
  ])
  assert.equal(candidates.length, 0)
})

test('keeps a pin with unknown price and flags it (missing data)', () => {
  const { candidates, flags } = run([
    { name: 'Mystery Cafe', category: 'coffee', interests: ['coffee'] },
  ])
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].priceUnknown, true)
  assert.deepEqual(flags.priceUnknown, ['Mystery Cafe'])
})

test('drops a pin whose known hours fall entirely outside the window', () => {
  const { candidates } = run([
    { name: 'Night Gallery', category: 'museum', interests: ['art'], openingHours: [{ open: '20:00', close: '23:00' }] },
  ])
  assert.equal(candidates.length, 0)
})

test('keeps a pin whose known hours overlap the window without flagging', () => {
  const { candidates } = run([
    { name: 'Day Gallery', category: 'museum', interests: ['art'], priceLevel: 1, openingHours: [{ open: '10:00', close: '17:00' }] },
  ])
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].hoursUnknown, false)
  assert.equal(candidates[0].priceUnknown, false)
})

test('keeps a pin with unknown hours and flags it (missing data)', () => {
  const { candidates, flags } = run([
    { name: 'Old Museum', category: 'museum', interests: ['art'], priceLevel: 2 },
  ])
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].hoursUnknown, true)
  assert.deepEqual(flags.hoursUnknown, ['Old Museum'])
})

test('keeps a pin with malformed hours and flags it as unknown (not silently dropped)', () => {
  const { candidates, flags } = run([
    { name: 'Glitchy Gallery', category: 'museum', interests: ['art'], priceLevel: 2, openingHours: [{ open: '25:99', close: 'zz:zz' }] },
  ])
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].hoursUnknown, true)
  assert.deepEqual(flags.hoursUnknown, ['Glitchy Gallery'])
})

test('with no group interests, activities are kept (not filtered out as noise)', () => {
  const noPrefMembers = [
    { name: 'A', interestTags: [], foodPrefs: [] },
    { name: 'B', interestTags: [], foodPrefs: [] },
  ]
  const pins = [
    { name: 'Random Museum', category: 'museum', interests: ['art'], priceLevel: 1 },
    { name: 'Random Park', category: 'park', interests: ['nature'], priceLevel: 0 },
  ]
  const { candidates } = hardFilter(pins, noPrefMembers, trip)
  assert.equal(candidates.length, 2) // both kept — nothing to judge relevance against
})

test('returns { candidates, flags } and does not mutate the input pins', () => {
  const pins = [{ name: 'MoMA', category: 'museum', interests: ['art'] }]
  const result = run(pins)
  assert.ok(Array.isArray(result.candidates))
  assert.ok(result.flags && Array.isArray(result.flags.priceUnknown))
  assert.equal('priceUnknown' in pins[0], false) // original untouched
})

// --- Stage 0: meeting point + travel radius ---

// Members with real coordinates clustered downtown SF, and a trip radius.
const geoMembers = [
  { name: 'A', interestTags: ['art'], startLocation: { latitude: 37.7955, longitude: -122.3937 } },
  { name: 'B', interestTags: ['art'], startLocation: { latitude: 37.7845, longitude: -122.4079 } },
  { name: 'C', interestTags: ['art'], startLocation: { latitude: 37.7749, longitude: -122.4194 } },
]

test('computes a meeting point when members carry coordinates', () => {
  const { meetingPoint } = hardFilter([], geoMembers, { ...trip, travelRadius: 3 })
  assert.equal(typeof meetingPoint.latitude, 'number')
  assert.equal(typeof meetingPoint.longitude, 'number')
})

test('meetingPoint is null when no member has coordinates', () => {
  const { meetingPoint } = run([{ name: 'MoMA', category: 'museum', tags: ['art'] }])
  assert.equal(meetingPoint, null)
})

test('drops a pin outside travelRadius of the meeting point', () => {
  const nearPin = { name: 'Downtown Gallery', category: 'museum', interests: ['art'], latitude: 37.7845, longitude: -122.4079 }
  const farPin = { name: 'Ocean Beach Art', category: 'museum', interests: ['art'], latitude: 37.7594, longitude: -122.5107 } // ~5+ mi west
  const { candidates } = hardFilter([nearPin, farPin], geoMembers, { ...trip, travelRadius: 3 })
  const names = candidates.map((p) => p.name)
  assert.ok(names.includes('Downtown Gallery'))
  assert.ok(!names.includes('Ocean Beach Art'))
})

test('no travelRadius set => radius filter is a no-op (keeps a far pin)', () => {
  const farPin = { name: 'Ocean Beach Art', category: 'museum', interests: ['art'], latitude: 37.7594, longitude: -122.5107 }
  const { candidates } = hardFilter([farPin], geoMembers, trip) // trip has no travelRadius
  assert.equal(candidates.length, 1)
})

test('travelRadius set but no member coords => radius filter is a no-op', () => {
  const farPin = { name: 'Ocean Beach Art', category: 'museum', interests: ['art'], latitude: 37.7594, longitude: -122.5107 }
  const { candidates, meetingPoint } = hardFilter([farPin], members, { ...trip, travelRadius: 1 })
  assert.equal(meetingPoint, null)
  assert.equal(candidates.length, 1) // not dropped — can't anchor without coords
})

test('drops a pin explicitly closed on the trip day (openingHours: null)', () => {
  const { candidates, flags } = run([
    { name: 'Closed Today', category: 'museum', interests: ['art'], priceLevel: 1, openingHours: null },
  ])
  assert.equal(candidates.length, 0) // hard drop, not kept
  assert.equal(flags.hoursUnknown.includes('Closed Today'), false) // not flagged as unknown
})

test('keeps a pin with unknown hours (openingHours: undefined) and flags it', () => {
  const { candidates, flags } = run([
    { name: 'Unknown Hours', category: 'museum', interests: ['art'], priceLevel: 1, openingHours: undefined },
  ])
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].name, 'Unknown Hours')
  assert.equal(candidates[0].hoursUnknown, true)
  assert.ok(flags.hoursUnknown.includes('Unknown Hours'))
})
