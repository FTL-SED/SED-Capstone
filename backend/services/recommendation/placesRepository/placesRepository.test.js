import { test } from 'node:test'
import assert from 'node:assert/strict'

import { mapPinToPlace, dedupePins, toPacificHHMM } from './placesRepository.js'

const pin = (overrides) => ({
  id: 1,
  name: 'La Taqueria',
  tags: [],
  rating: null,
  pricePerPerson: 14,
  latitude: 37.7509,
  longitude: -122.418,
  address: '2889 Mission St',
  locationImageUrl: 'https://images.navquest.dev/la-taqueria.jpg',
  startTime: new Date('2026-08-15T19:00:00.000Z'), // 12:00 Pacific
  endTime: new Date('2026-08-15T20:00:00.000Z'), // 13:00 Pacific
  ...overrides,
})

test('mapPinToPlace: a "food"-tagged pin is a restaurant', () => {
  const place = mapPinToPlace(pin({ tags: ['food', 'mexican', 'casual'] }))
  assert.equal(place.category, 'restaurant')
})

test('mapPinToPlace: a cuisine tag alone (no "food" tag) is still a restaurant', () => {
  const place = mapPinToPlace(pin({ tags: ['mexican', 'casual'] }))
  assert.equal(place.category, 'restaurant')
})

test('mapPinToPlace: a diet tag alone (no "food"/cuisine tag) is still a restaurant', () => {
  const place = mapPinToPlace(pin({ tags: ['vegetarian'] }))
  assert.equal(place.category, 'restaurant')
})

test('mapPinToPlace: everything else is an activity', () => {
  const place = mapPinToPlace(pin({ tags: ['art', 'museum', 'indoor'] }))
  assert.equal(place.category, 'activity')
})

test('mapPinToPlace: an untagged pin (missing data) defaults to activity, not a crash', () => {
  const place = mapPinToPlace(pin({ tags: [] }))
  assert.equal(place.category, 'activity')
  assert.deepEqual(place.tags, [])
})

test('mapPinToPlace: extracts cuisine tags into place.cuisine', () => {
  const place = mapPinToPlace(pin({ tags: ['food', 'mexican', 'casual'] }))
  assert.deepEqual(place.cuisine, ['mexican'])
})

test('mapPinToPlace: cuisine is undefined (not []) when no cuisine tag is present', () => {
  const place = mapPinToPlace(pin({ tags: ['food', 'casual'] }))
  assert.equal(place.cuisine, undefined)
})

test('mapPinToPlace: extracts diet tags into place.diet', () => {
  const place = mapPinToPlace(pin({ tags: ['food', 'vegan', 'vegetarian'] }))
  assert.deepEqual(place.diet, ['vegan', 'vegetarian'])
})

test('mapPinToPlace: diet is undefined (not []) when no diet tag is present - must stay "unknown", not "confirmed empty"', () => {
  const place = mapPinToPlace(pin({ tags: ['food', 'mexican'] }))
  assert.equal(place.diet, undefined)
})

test('mapPinToPlace: a tag can be both a cuisine and a diet (e.g. "vegan")', () => {
  const place = mapPinToPlace(pin({ tags: ['food', 'vegan'] }))
  assert.deepEqual(place.cuisine, ['vegan'])
  assert.deepEqual(place.diet, ['vegan'])
})

test('mapPinToPlace: carries a known rating through', () => {
  const place = mapPinToPlace(pin({ rating: 4.8 }))
  assert.equal(place.rating, 4.8)
})

test('mapPinToPlace: rating is undefined (not null) when unrated (missing data)', () => {
  const place = mapPinToPlace(pin({ rating: null }))
  assert.equal(place.rating, undefined)
})

test('mapPinToPlace: derives openingHours from the pin\'s own scheduled startTime/endTime in Pacific time', () => {
  const place = mapPinToPlace(pin({}))
  assert.deepEqual(place.openingHours, [{ open: '12:00', close: '13:00' }])
})

test('mapPinToPlace: carries pricePerPerson/coords/name through unchanged', () => {
  const place = mapPinToPlace(pin({}))
  assert.equal(place.name, 'La Taqueria')
  assert.equal(place.pricePerPerson, 14)
  assert.equal(place.latitude, 37.7509)
  assert.equal(place.longitude, -122.418)
})

test('toPacificHHMM: converts a UTC instant to zero-padded Pacific "HH:MM"', () => {
  assert.equal(toPacificHHMM(new Date('2026-08-15T19:00:00.000Z')), '12:00')
  assert.equal(toPacificHHMM(new Date('2026-08-15T07:00:00.000Z')), '00:00') // midnight edge case
})

test('dedupePins: drops a repeat of the same name+coordinates', () => {
  const pins = [pin({ id: 1 }), pin({ id: 2 })] // same name/coords, different itinerary
  const result = dedupePins(pins)
  assert.equal(result.length, 1)
})

test('dedupePins: keeps places with the same name at different coordinates', () => {
  const pins = [pin({ id: 1 }), pin({ id: 2, latitude: 40 })]
  const result = dedupePins(pins)
  assert.equal(result.length, 2)
})

test('dedupePins: does not mutate the input array', () => {
  const pins = [pin({ id: 1 }), pin({ id: 2 })]
  const originalLength = pins.length
  dedupePins(pins)
  assert.equal(pins.length, originalLength)
})
