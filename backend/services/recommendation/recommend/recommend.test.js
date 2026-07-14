import { test } from 'node:test'
import assert from 'node:assert/strict'

import { recommend } from './recommend.js'

const members = [
  { name: 'Alice', startLocation: 'Downtown', interestTags: ['art', 'museum'], foodPrefs: ['sushi'] },
  { name: 'Bob', startLocation: 'Mission', interestTags: ['coffee'], foodPrefs: ['ramen'] },
  { name: 'Cara', startLocation: 'Sunset', interestTags: ['stamps'] }, // niche — only one place matches
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
// restaurants matching their food prefs, and one niche place only Cara likes.
const places = [
  ...Array.from({ length: 10 }, (_, i) =>
    activity(`Activity ${i}`, i % 2 === 0 ? ['art', 'museum'] : ['coffee'])
  ),
  ...Array.from({ length: 10 }, (_, i) =>
    restaurant(`Restaurant ${i}`, i % 2 === 0 ? ['sushi'] : ['ramen'])
  ),
  { name: 'Stamp Museum', category: 'museum', tags: ['stamps'] }, // Cara's only match
]

test('runs end-to-end and returns a { shortlist, constraints } shape', () => {
  const result = recommend(trip, members, places)
  assert.ok(Array.isArray(result.shortlist))
  assert.ok(result.shortlist.length > 0)
  assert.ok(result.constraints)
})

test('constraints carry maxBudgetPerPerson, groupSize, and startingLocations', () => {
  const { constraints } = recommend(trip, members, places)
  assert.equal(constraints.maxBudgetPerPerson, 60)
  assert.equal(constraints.groupSize, 3)
  assert.deepEqual(constraints.startingLocations, ['Downtown', 'Mission', 'Sunset'])
})

test('food count stays within [FOOD_MIN, FOOD_MAX] on a well-stocked catalog', () => {
  const { shortlist } = recommend(trip, members, places)
  const foodCount = shortlist.filter((p) => p.category === 'restaurant').length
  assert.ok(foodCount >= 6 && foodCount <= 10, `foodCount was ${foodCount}`)
})

test('fairness guarantee still holds end-to-end: a niche member gets covered even if their match ranks low', () => {
  const { shortlist } = recommend(trip, members, places)
  assert.ok(shortlist.some((p) => p.name === 'Stamp Museum'))
})

test('does not mutate the input places array', () => {
  const originalLength = places.length
  const snapshotFirstName = places[0].name
  recommend(trip, members, places)
  assert.equal(places.length, originalLength)
  assert.equal(places[0].name, snapshotFirstName)
  assert.equal('score' in places[0], false) // scoring produces copies, not mutations
})

test('drops places that fail hard filters (irrelevant activity, over-budget restaurant)', () => {
  const noisyPlaces = [
    ...places,
    { name: 'Skate Park', category: 'park', tags: ['skating'] }, // no interest overlap
    { name: 'Fancy Tasting Menu', category: 'restaurant', tags: [], priceLevel: 4 }, // $80 > $60 budget
  ]
  const { shortlist } = recommend(trip, members, noisyPlaces)
  assert.ok(!shortlist.some((p) => p.name === 'Skate Park'))
  assert.ok(!shortlist.some((p) => p.name === 'Fancy Tasting Menu'))
})
