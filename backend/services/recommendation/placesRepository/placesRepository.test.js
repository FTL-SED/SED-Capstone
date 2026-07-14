import { test } from 'node:test'
import assert from 'node:assert/strict'

import { mapPinToPlace, dedupePins } from './placesRepository.js'

const pin = (overrides) => ({
  id: 1,
  name: 'La Taqueria',
  tags: [],
  pricePerPerson: 14,
  latitude: 37.7509,
  longitude: -122.418,
  address: '2889 Mission St',
  locationImageUrl: 'https://images.navquest.dev/la-taqueria.jpg',
  ...overrides,
})

test('mapPinToPlace: categorizes a "food"-tagged pin as a restaurant', () => {
  const place = mapPinToPlace(pin({ tags: ['food', 'mexican', 'casual'] }))
  assert.equal(place.category, 'restaurant')
})

test('mapPinToPlace: categorizes everything else as an activity', () => {
  const place = mapPinToPlace(pin({ tags: ['art', 'museum', 'indoor'] }))
  assert.equal(place.category, 'activity')
})

test('mapPinToPlace: an untagged pin (missing data) defaults to activity, not a crash', () => {
  const place = mapPinToPlace(pin({ tags: [] }))
  assert.equal(place.category, 'activity')
  assert.deepEqual(place.tags, [])
})

test('mapPinToPlace: carries pricePerPerson/coords/name through unchanged', () => {
  const place = mapPinToPlace(pin({}))
  assert.equal(place.name, 'La Taqueria')
  assert.equal(place.pricePerPerson, 14)
  assert.equal(place.latitude, 37.7509)
  assert.equal(place.longitude, -122.418)
})

test('mapPinToPlace: leaves cuisine/diet/rating/openingHours undefined (engine already handles unknown)', () => {
  const place = mapPinToPlace(pin({}))
  assert.equal(place.cuisine, undefined)
  assert.equal(place.diet, undefined)
  assert.equal(place.rating, undefined)
  assert.equal(place.openingHours, undefined)
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
