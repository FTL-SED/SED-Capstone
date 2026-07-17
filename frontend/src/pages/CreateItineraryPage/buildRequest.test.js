import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildRecommendationBody } from './buildRequest.js'

const baseForm = {
  startTime: '09:00',
  endTime: '18:00',
  transport: 'transit',
  travelRadius: '5',
  startingLocations: [
    { label: 'Ferry Building', latitude: 37.7955, longitude: -122.3934 },
    { label: 'de Young', latitude: 37.7715, longitude: -122.4686 },
  ],
  interestTags: ['art', 'nature'],
  foodPrefs: ['italian'],
  budget: '120',
  isPublic: true,
}

test('maps a full form to { trip, group } with coerced numbers', () => {
  const { trip, group } = buildRecommendationBody(baseForm)
  assert.equal(trip.startTime, '09:00')
  assert.equal(trip.endTime, '18:00')
  assert.equal(trip.maxBudgetPerPerson, 120) // number, not "120"
  assert.equal(trip.transport, 'transit')
  assert.equal(trip.travelRadius, 5) // number
  assert.equal(group.startingCoordinates.length, 2)
  assert.deepEqual(group.startingCoordinates[0], { latitude: 37.7955, longitude: -122.3934 })
  assert.deepEqual(group.interestTags, ['art', 'nature'])
  assert.deepEqual(group.foodPrefs, ['italian'])
})

test('omits travelRadius when blank (backend rejects 0/"")', () => {
  const { trip } = buildRecommendationBody({ ...baseForm, travelRadius: '' })
  assert.equal('travelRadius' in trip, false)
})

test('omits travelRadius when zero or negative', () => {
  assert.equal('travelRadius' in buildRecommendationBody({ ...baseForm, travelRadius: '0' }).trip, false)
  assert.equal('travelRadius' in buildRecommendationBody({ ...baseForm, travelRadius: '-3' }).trip, false)
})

test('omits transport when not chosen', () => {
  const { trip } = buildRecommendationBody({ ...baseForm, transport: '' })
  assert.equal('transport' in trip, false)
})

test('strips the picker label from coordinates (backend wants only lat/lng)', () => {
  const { group } = buildRecommendationBody(baseForm)
  assert.equal('label' in group.startingCoordinates[0], false)
})
