import { test } from 'node:test'
import assert from 'node:assert/strict'

import { mapPin, dedupePins, toPacificHHMM } from './pinsRepository.js'

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

test('mapPin: a "food"-tagged pin is a restaurant', () => {
  const result = mapPin(pin({ tags: ['food', 'mexican', 'casual'] }))
  assert.equal(result.category, 'restaurant')
})

test('mapPin: a cuisine tag alone (no "food" tag) is still a restaurant', () => {
  const result = mapPin(pin({ tags: ['mexican', 'casual'] }))
  assert.equal(result.category, 'restaurant')
})

test('mapPin: a diet tag alone (no "food"/cuisine tag) is still a restaurant', () => {
  const result = mapPin(pin({ tags: ['vegetarian'] }))
  assert.equal(result.category, 'restaurant')
})

test('mapPin: everything else is an activity', () => {
  const result = mapPin(pin({ tags: ['art', 'museum', 'indoor'] }))
  assert.equal(result.category, 'activity')
})

test('mapPin: an untagged pin (missing data) defaults to activity, not a crash', () => {
  const result = mapPin(pin({ tags: [] }))
  assert.equal(result.category, 'activity')
  assert.deepEqual(result.tags, [])
})

test('mapPin: extracts cuisine tags into pin.cuisine', () => {
  const result = mapPin(pin({ tags: ['food', 'mexican', 'casual'] }))
  assert.deepEqual(result.cuisine, ['mexican'])
})

test('mapPin: cuisine is undefined (not []) when no cuisine tag is present', () => {
  const result = mapPin(pin({ tags: ['food', 'casual'] }))
  assert.equal(result.cuisine, undefined)
})

test('mapPin: extracts diet tags into pin.diet', () => {
  const result = mapPin(pin({ tags: ['food', 'vegan', 'vegetarian'] }))
  assert.deepEqual(result.diet, ['vegan', 'vegetarian'])
})

test('mapPin: diet is undefined (not []) when no diet tag is present - must stay "unknown", not "confirmed empty"', () => {
  const result = mapPin(pin({ tags: ['food', 'mexican'] }))
  assert.equal(result.diet, undefined)
})

test('mapPin: a tag can be both a cuisine and a diet (e.g. "vegan")', () => {
  const result = mapPin(pin({ tags: ['food', 'vegan'] }))
  assert.deepEqual(result.cuisine, ['vegan'])
  assert.deepEqual(result.diet, ['vegan'])
})

test('mapPin: carries a known rating through', () => {
  const result = mapPin(pin({ rating: 4.8 }))
  assert.equal(result.rating, 4.8)
})

test('mapPin: rating is undefined (not null) when unrated (missing data)', () => {
  const result = mapPin(pin({ rating: null }))
  assert.equal(result.rating, undefined)
})

test('mapPin: derives openingHours from the pin\'s own scheduled startTime/endTime in Pacific time', () => {
  const result = mapPin(pin({}))
  assert.deepEqual(result.openingHours, [{ open: '12:00', close: '13:00' }])
})

test('mapPin: carries pricePerPerson/coords/name through unchanged', () => {
  const result = mapPin(pin({}))
  assert.equal(result.name, 'La Taqueria')
  assert.equal(result.pricePerPerson, 14)
  assert.equal(result.latitude, 37.7509)
  assert.equal(result.longitude, -122.418)
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

test('dedupePins: keeps pins with the same name at different coordinates', () => {
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
