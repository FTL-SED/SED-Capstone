import { test } from 'node:test'
import assert from 'node:assert/strict'

import { recommend } from './recommend.js'

const members = [
  { name: 'Alice', startLocation: 'Downtown', interestTags: ['art', 'museum'], foodPrefs: ['sushi'] },
  { name: 'Bob', startLocation: 'Mission', interestTags: ['coffee'], foodPrefs: ['ramen'] },
  { name: 'Cara', startLocation: 'Sunset', interestTags: ['stamps'] }, // niche — only one pin matches
]
const trip = { startTime: '09:00', endTime: '18:00', maxBudgetPerPerson: 60 }

const activity = (name, tags) => ({ name, category: 'museum', tags })
const restaurant = (name, cuisine, priceLevel = 1) => ({
  name,
  category: 'restaurant',
  tags: [],
  cuisine,
  priceLevel,
})

// A generous mock catalog: 10 activities liked by Alice/Bob, 10 affordable
// restaurants matching their food prefs, and one niche pin only Cara likes.
const pins = [
  ...Array.from({ length: 10 }, (_, i) =>
    activity(`Activity ${i}`, i % 2 === 0 ? ['art', 'museum'] : ['coffee'])
  ),
  ...Array.from({ length: 10 }, (_, i) =>
    restaurant(`Restaurant ${i}`, i % 2 === 0 ? ['sushi'] : ['ramen'])
  ),
  { name: 'Stamp Museum', category: 'museum', tags: ['stamps'] }, // Cara's only match
]

test('runs end-to-end and returns a { shortlist, constraints } shape', () => {
  const result = recommend(trip, members, pins)
  assert.ok(Array.isArray(result.shortlist))
  assert.ok(result.shortlist.length > 0)
  assert.ok(result.constraints)
})

test('constraints carry maxBudgetPerPerson, groupSize, and startingLocations', () => {
  const { constraints } = recommend(trip, members, pins)
  assert.equal(constraints.maxBudgetPerPerson, 60)
  assert.equal(constraints.groupSize, 3)
  assert.deepEqual(constraints.startingLocations, ['Downtown', 'Mission', 'Sunset'])
})

test('constraints carry timeWindow, and meetingPoint/travelRadius are null pre-geocoding', () => {
  const { constraints } = recommend(trip, members, pins)
  assert.deepEqual(constraints.timeWindow, { startTime: '09:00', endTime: '18:00' })
  // string startLocations (no coords) + no travelRadius => nothing to anchor on
  assert.equal(constraints.meetingPoint, null)
  assert.equal(constraints.travelRadius, null)
  assert.equal(constraints.maxMemberDistance, null)
})

test('foodBelowMin is false when the catalog has enough restaurants', () => {
  const { constraints } = recommend(trip, members, pins) // 10 restaurants ≥ FOOD_MIN
  assert.equal(constraints.foodBelowMin, false)
})

test('foodBelowMin is true when few restaurants exist (food desert)', () => {
  const sparse = [
    activity('Museum', ['art', 'museum']),
    activity('Cafe', ['coffee']),
    restaurant('Only Sushi', ['sushi']), // just 1 restaurant, < FOOD_MIN (6)
  ]
  const { constraints } = recommend(trip, members, sparse)
  assert.equal(constraints.foodBelowMin, true)
})

test('Stage 0: with geocoded members + a radius, constraints carry the meeting point and drop far pins', () => {
  const geoMembers = [
    { name: 'A', interestTags: ['art'], foodPrefs: [], startLocation: { latitude: 37.7955, longitude: -122.3937 } },
    { name: 'B', interestTags: ['art'], foodPrefs: [], startLocation: { latitude: 37.7845, longitude: -122.4079 } },
    { name: 'C', interestTags: ['art'], foodPrefs: [], startLocation: { latitude: 37.7749, longitude: -122.4194 } },
  ]
  const geoTrip = { startTime: '09:00', endTime: '18:00', maxBudgetPerPerson: 60, travelRadius: 3 }
  const geoPins = [
    { name: 'Near Gallery', category: 'museum', tags: ['art'], priceLevel: 1, latitude: 37.7845, longitude: -122.4079 },
    { name: 'Far Gallery', category: 'museum', tags: ['art'], priceLevel: 1, latitude: 37.7594, longitude: -122.5107 }, // ~5+ mi
  ]
  const { shortlist, constraints } = recommend(geoTrip, geoMembers, geoPins)

  assert.equal(typeof constraints.meetingPoint.latitude, 'number')
  assert.equal(constraints.travelRadius, 3)
  assert.ok(constraints.maxMemberDistance >= 0)
  assert.ok(shortlist.some((p) => p.name === 'Near Gallery'))
  assert.ok(!shortlist.some((p) => p.name === 'Far Gallery'))
})

test('food count stays within [FOOD_MIN, FOOD_MAX] on a well-stocked catalog', () => {
  const { shortlist } = recommend(trip, members, pins)
  const foodCount = shortlist.filter((p) => p.category === 'restaurant').length
  assert.ok(foodCount >= 6 && foodCount <= 10, `foodCount was ${foodCount}`)
})

test('fairness guarantee still holds end-to-end: a niche member gets covered even if their match ranks low', () => {
  const { shortlist } = recommend(trip, members, pins)
  assert.ok(shortlist.some((p) => p.name === 'Stamp Museum'))
})

test('does not mutate the input pins array', () => {
  const originalLength = pins.length
  const snapshotFirstName = pins[0].name
  recommend(trip, members, pins)
  assert.equal(pins.length, originalLength)
  assert.equal(pins[0].name, snapshotFirstName)
  assert.equal('score' in pins[0], false) // scoring produces copies, not mutations
})

test('drops pins that fail hard filters (irrelevant activity, over-budget restaurant)', () => {
  const noisyPins = [
    ...pins,
    { name: 'Skate Park', category: 'park', tags: ['skating'] }, // no interest overlap
    { name: 'Fancy Tasting Menu', category: 'restaurant', tags: [], priceLevel: 4 }, // $80 > $60 budget
  ]
  const { shortlist } = recommend(trip, members, noisyPins)
  assert.ok(!shortlist.some((p) => p.name === 'Skate Park'))
  assert.ok(!shortlist.some((p) => p.name === 'Fancy Tasting Menu'))
})
