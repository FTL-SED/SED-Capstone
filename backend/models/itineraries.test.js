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

test('reshapeItinerary strips owner-only fields (members, meeting point) for non-owners', () => {
  const row = {
    id: 7, title: 'Day', location: 'SF', _count: { likes: 0 }, stops: [],
    meetingPointLat: 37.77, meetingPointLng: -122.41,
    maxBudgetPerPerson: 80, dayStart: '09:00', // non-sensitive trip constraints stay
    members: [
      { id: 1, name: 'Ana', startLabel: '123 Real St, SF', startLat: 37.78, startLng: -122.4, interestTags: ['art'], foodPrefs: [], diets: [] },
    ],
  }

  // Owner sees the full picture.
  const owner = reshapeItinerary(row, { forOwner: true })
  assert.ok(Array.isArray(owner.members) && owner.members.length === 1)
  assert.equal(owner.meetingPointLat, 37.77)

  // A stranger viewing a PUBLIC itinerary must NOT get members' names/addresses
  // or the home-derived meeting point.
  const stranger = reshapeItinerary(row, { forOwner: false })
  assert.equal(stranger.members, undefined)
  assert.equal(stranger.meetingPointLat, undefined)
  assert.equal(stranger.meetingPointLng, undefined)
  // Non-sensitive trip constraints are still visible (e.g. budget for US #1).
  assert.equal(stranger.maxBudgetPerPerson, 80)
  assert.equal(stranger.dayStart, '09:00')
})
