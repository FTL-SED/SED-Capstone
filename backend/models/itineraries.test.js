import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reshapeItinerary } from './itineraries.js'

test('reshapeItinerary flattens stops+pin into the legacy pins[] shape', () => {
  const row = {
    id: 7, title: 'Day', location: 'SF', _count: { likes: 2 },
    stops: [
      { orderInItinerary: 0, startTime: new Date('2026-01-01T17:00:00Z'), endTime: new Date('2026-01-01T18:00:00Z'),
        travelTimeToNextMinutes: 10, distanceToNextMeters: 500, mealType: 'lunch', note: 'grab tacos',
        pin: { id: 3, name: 'Taqueria', description: 'tacos', tags: ['food','mexican'], interests: [], cuisines: ['mexican'], diets: [],
               rating: 4.5, pricePerPerson: 14, latitude: 37.75, longitude: -122.41, address: 'SF', locationImageUrl: null } },
    ],
  }
  const out = reshapeItinerary(row)
  assert.equal(out.likeCount, 2)
  assert.equal(out.stops, undefined)
  const p = out.pins[0]
  assert.equal(p.name, 'Taqueria')
  assert.equal(p.orderInItinerary, 0)
  assert.equal(p.pricePerPerson, 14)
  assert.equal(p.travelTimeToNextMinutes, 10)
  assert.equal(p.mealType, 'lunch')
  assert.ok(p.tags.includes('mexican'))
  assert.ok(p.tags.includes('lunch'))
  assert.equal(p.description, 'grab tacos') // stop.note overrides pin.description (matches persist behavior)
})
