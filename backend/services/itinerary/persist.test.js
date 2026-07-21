import { test } from 'node:test'
import assert from 'node:assert/strict'

import { stopsToStops, toDateTime, pacificOffset } from './persist.js'

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

test('stopsToStops maps stops onto ItineraryStop rows with pinId references', () => {
  const rows = stopsToStops(stops, shortlist, '2026-07-15')
  assert.equal(rows.length, 2)
  assert.equal(rows[0].orderInItinerary, 0)
  assert.equal(rows[1].orderInItinerary, 1)
})

test('stopsToStops uses pinId from shortlist (not venue field copying)', () => {
  const [ferry] = stopsToStops(stops, shortlist, '2026-07-15')
  assert.equal(ferry.pinId, 1) // references catalog pin by id
  assert.equal(ferry.name, undefined) // venue fields NOT on the stop
  assert.equal(ferry.latitude, undefined)
  assert.equal(ferry.locationImageUrl, undefined)
  assert.equal(ferry.rating, undefined)
  assert.equal(ferry.pricePerPerson, undefined)
})

test('stopsToStops converts arrive/depart to DateTime objects', () => {
  const [ferry] = stopsToStops(stops, shortlist, '2026-07-15')
  assert.ok(ferry.startTime instanceof Date)
  assert.equal(ferry.startTime.toISOString(), '2026-07-15T16:00:00.000Z') // 09:00 PDT
  assert.equal(ferry.endTime.toISOString(), '2026-07-15T17:30:00.000Z') // 10:30 PDT
})

test('stopsToStops carries mealType as-is (not folded into tags)', () => {
  const rows = stopsToStops(stops, shortlist, '2026-07-15')
  assert.equal(rows[1].mealType, 'lunch')
  assert.equal(rows[1].tags, undefined) // no tag field on stops
})

test('stopsToStops carries stop note as note field', () => {
  const rows = stopsToStops(stops, shortlist, '2026-07-15')
  assert.equal(rows[1].note, 'Grab pastries')
})

test('stopsToStops carries travel legs to the ItineraryStop row', () => {
  const rows = stopsToStops(stops, shortlist, '2026-07-15')
  assert.equal(rows[0].travelTimeToNextMinutes, 12)
  assert.equal(rows[0].distanceToNextMeters, 3000)
  assert.equal(rows[1].travelTimeToNextMinutes, null) // last stop
})

test('stopsToStops throws if a stop references a pinId not in the shortlist', () => {
  const bad = [{ pinId: 999, arriveTime: '09:00', departTime: '10:00' }]
  assert.throws(() => stopsToStops(bad, shortlist, '2026-07-15'), /not in the shortlist/)
})
