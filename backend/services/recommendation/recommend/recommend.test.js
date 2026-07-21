import { test } from 'node:test'
import assert from 'node:assert/strict'

import { recommend } from './recommend.js'

const members = [
  { name: 'Alice', startLocation: { latitude: 37.7880, longitude: -122.4074 }, interestTags: ['art', 'museum'], foodPrefs: ['sushi'] }, // Downtown
  { name: 'Bob', startLocation: { latitude: 37.7599, longitude: -122.4148 }, interestTags: ['coffee'], foodPrefs: ['ramen'] }, // Mission
  { name: 'Cara', startLocation: { latitude: 37.7599, longitude: -122.4869 }, interestTags: ['stamps'] }, // Sunset — niche, only one pin matches
]
const trip = { startTime: '09:00', endTime: '18:00', maxBudgetPerPerson: 60 }

const activity = (name, interests) => ({ name, category: 'museum', interests })
const restaurant = (name, cuisine, priceLevel = 1) => ({
  name,
  category: 'restaurant',
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
  { name: 'Stamp Museum', category: 'museum', interests: ['stamps'] }, // Cara's only match
]

test('runs end-to-end and returns a { shortlist, constraints } shape', () => {
  const result = recommend(trip, members, pins)
  assert.ok(Array.isArray(result.shortlist))
  assert.ok(result.shortlist.length > 0)
  assert.ok(result.constraints)
})

test('constraints carry maxBudgetPerPerson, groupSize, and startingCoordinates', () => {
  const { constraints } = recommend(trip, members, pins)
  assert.equal(constraints.maxBudgetPerPerson, 60)
  assert.equal(constraints.groupSize, 3)
  assert.deepEqual(constraints.startingCoordinates, members.map((m) => m.startLocation))
})

test('constraints carry timeWindow; meetingPoint is computed from member coords, travelRadius null when unset', () => {
  const { constraints } = recommend(trip, members, pins)
  assert.deepEqual(constraints.timeWindow, { startTime: '09:00', endTime: '18:00' })
  // members carry coords => a fair meeting point is computed; maxMemberDistance
  // is the worst-off member's distance to it. travelRadius stays null (unset).
  assert.ok(constraints.meetingPoint && typeof constraints.meetingPoint.latitude === 'number')
  assert.equal(typeof constraints.maxMemberDistance, 'number')
  assert.equal(constraints.travelRadius, null)
})

test('meetingPoint is null when members carry no coordinates', () => {
  const noCoords = members.map(({ startLocation, ...m }) => m)
  const { constraints } = recommend(trip, noCoords, pins)
  assert.equal(constraints.meetingPoint, null)
  assert.equal(constraints.maxMemberDistance, null)
})

test('constraints pass transport through for the AI (null when unset)', () => {
  const walked = recommend({ ...trip, transport: 'walking' }, members, pins)
  assert.equal(walked.constraints.transport, 'walking')
  const noTransport = recommend(trip, members, pins)
  assert.equal(noTransport.constraints.transport, null)
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
    { name: 'Near Gallery', category: 'museum', interests: ['art'], priceLevel: 1, latitude: 37.7845, longitude: -122.4079 },
    { name: 'Far Gallery', category: 'museum', interests: ['art'], priceLevel: 1, latitude: 37.7594, longitude: -122.5107 }, // ~5+ mi
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

test('mixed-diet group: meal pool is not emptied, and each dieted member can eat somewhere', () => {
  // A vegan + a halal-only member: no single restaurant serves both, so the old
  // "serve everyone" rule would have dropped nearly all restaurants. Now each
  // gets ≥1 eatable option via diet coverage.
  const dietMembers = [
    { name: 'Vera', startLocation: { latitude: 37.7880, longitude: -122.4074 }, interestTags: ['art'], foodPrefs: [], diet: ['vegan'] }, // Downtown
    { name: 'Hal', startLocation: { latitude: 37.7599, longitude: -122.4148 }, interestTags: ['art'], foodPrefs: [], diet: ['halal'] }, // Mission
  ]
  const dietPins = [
    activity('Museum', ['art']),
    { name: 'Vegan Vibes', category: 'restaurant', cuisine: ['vegan'], diet: ['vegan'], priceLevel: 2 },
    { name: 'Halal Grill', category: 'restaurant', cuisine: ['mediterranean'], diet: ['halal'], priceLevel: 2 },
    { name: 'Steakhouse', category: 'restaurant', cuisine: ['steak'], diet: ['none'], priceLevel: 2 },
  ]
  const { shortlist } = recommend(trip, dietMembers, dietPins)
  const restaurants = shortlist.filter((p) => p.category === 'restaurant')
  assert.ok(restaurants.length > 0, 'meal pool should not be empty for a mixed-diet group')
  assert.ok(shortlist.some((p) => p.name === 'Vegan Vibes'), 'Vera (vegan) needs an option')
  assert.ok(shortlist.some((p) => p.name === 'Halal Grill'), 'Hal (halal) needs an option')
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
    { name: 'Skate Park', category: 'park', interests: ['skating'] }, // no interest overlap
    { name: 'Fancy Tasting Menu', category: 'restaurant', cuisine: ['fusion'], priceLevel: 4 }, // $80 > $60 budget
  ]
  const { shortlist } = recommend(trip, members, noisyPins)
  assert.ok(!shortlist.some((p) => p.name === 'Skate Park'))
  assert.ok(!shortlist.some((p) => p.name === 'Fancy Tasting Menu'))
})
