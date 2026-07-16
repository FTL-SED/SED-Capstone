import { test } from 'node:test'
import assert from 'node:assert/strict'

import { stopsToPins, toDateTime, pacificOffset } from './persist.js'

const shortlist = [
  { id: 1, name: 'Ferry Building', category: 'activity', tags: ['food'], latitude: 37.7955, longitude: -122.3937, address: 'SF', locationImageUrl: 'ferry.jpg', rating: 4.5, description: 'A market.', pricePerPerson: 0 },
  { id: 2, name: 'Tartine', category: 'restaurant', tags: ['bakery'], latitude: 37.7614, longitude: -122.4241, address: 'SF', locationImageUrl: 'tartine.jpg', pricePerPerson: 25 },
]

const stops = [
  { pinId: 1, arriveTime: '09:00', departTime: '10:30', travelTimeToNextMinutes: 12, distanceToNextMeters: 3000 },
  { pinId: 2, arriveTime: '12:00', departTime: '13:00', mealType: 'lunch', note: 'Grab pastries' },
]

test('pacificOffset returns PDT in summer and PST in winter (DST-aware)', () => {
  assert.equal(pacificOffset('2026-07-15'), '-07:00')
  assert.equal(pacificOffset('2026-01-15'), '-08:00')
})

test('toDateTime combines day + HH:MM at the given Pacific offset', () => {
  const dt = toDateTime('2026-07-15', '09:00', '-07:00')
  // 09:00 PDT === 16:00 UTC
  assert.equal(dt.toISOString(), '2026-07-15T16:00:00.000Z')
})

test('maps each stop onto a Pin row with array index as orderInItinerary', () => {
  const pins = stopsToPins(stops, shortlist, '2026-07-15')
  assert.equal(pins.length, 2)
  assert.equal(pins[0].orderInItinerary, 0)
  assert.equal(pins[1].orderInItinerary, 1)
})

test('re-hydrates display fields from the shortlist by pinId', () => {
  const [ferry] = stopsToPins(stops, shortlist, '2026-07-15')
  assert.equal(ferry.name, 'Ferry Building')
  assert.equal(ferry.latitude, 37.7955)
  assert.equal(ferry.locationImageUrl, 'ferry.jpg')
  assert.equal(ferry.rating, 4.5)
})

test('uses the shortlist pin price for pricePerPerson (cost is a fact of the place)', () => {
  const pins = stopsToPins(stops, shortlist, '2026-07-15')
  assert.equal(pins[1].pricePerPerson, 25) // from the shortlist pin, not the stop
})

test('folds mealType into tags so it survives without a schema column', () => {
  const pins = stopsToPins(stops, shortlist, '2026-07-15')
  assert.ok(pins[1].tags.includes('lunch'))
  assert.ok(pins[1].tags.includes('bakery')) // original tags preserved
})

test('prefers the stop note over the pin description', () => {
  const pins = stopsToPins(stops, shortlist, '2026-07-15')
  assert.equal(pins[1].description, 'Grab pastries')
})

test('converts arrive/depart to DateTime objects', () => {
  const [ferry] = stopsToPins(stops, shortlist, '2026-07-15')
  assert.ok(ferry.startTime instanceof Date)
  assert.equal(ferry.startTime.toISOString(), '2026-07-15T16:00:00.000Z') // 09:00 PDT
  assert.equal(ferry.endTime.toISOString(), '2026-07-15T17:30:00.000Z') // 10:30 PDT
})

test('carries travel legs through to the Pin row', () => {
  const pins = stopsToPins(stops, shortlist, '2026-07-15')
  assert.equal(pins[0].travelTimeToNextMinutes, 12)
  assert.equal(pins[0].distanceToNextMeters, 3000)
  assert.equal(pins[1].travelTimeToNextMinutes, null) // last stop
})

test('throws if a stop references a pinId not in the shortlist', () => {
  const bad = [{ pinId: 999, arriveTime: '09:00', departTime: '10:00' }]
  assert.throws(() => stopsToPins(bad, shortlist, '2026-07-15'), /not in the shortlist/)
})
