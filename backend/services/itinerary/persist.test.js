import { test } from 'node:test'
import assert from 'node:assert/strict'

import { stopsToStops, toDateTime, pacificOffset, memberRows, constraintColumns } from './persist.js'

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

test('stopsToStops rolls the calendar day for an overnight schedule', () => {
  // A late-night plan: second stop crosses midnight, third is fully after it.
  // Each persisted endTime must stay AFTER its startTime as an absolute instant,
  // and after-midnight stops must land on the NEXT calendar day.
  const overnightStops = [
    { pinId: 1, arriveTime: '22:00', departTime: '23:15' },
    { pinId: 2, arriveTime: '23:30', departTime: '00:30' }, // crosses midnight
  ]
  const rows = stopsToStops(overnightStops, shortlist, '2026-07-15')

  // Stop 0 both times on the 15th (22:00/23:15 PDT → 05:00/06:15 UTC next day).
  assert.equal(rows[0].startTime.toISOString(), '2026-07-16T05:00:00.000Z')
  assert.equal(rows[0].endTime.toISOString(), '2026-07-16T06:15:00.000Z')
  // Stop 1 arrives 23:30 on the 15th, departs 00:30 which rolls to the 16th.
  assert.equal(rows[1].startTime.toISOString(), '2026-07-16T06:30:00.000Z')
  assert.equal(rows[1].endTime.toISOString(), '2026-07-16T07:30:00.000Z')
  // Every stop: end strictly after start; sequence monotonic across midnight.
  for (const r of rows) assert.ok(r.endTime > r.startTime, 'endTime must be after startTime')
  assert.ok(rows[1].startTime > rows[0].endTime, 'stops stay in order across midnight')
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

test('memberRows maps group members onto ItineraryMember rows', () => {
  const members = [
    { name: 'Ana', startLocation: { latitude: 37.78, longitude: -122.41, label: 'SoMa, SF' }, interestTags: ['art'], foodPrefs: ['sushi'], diet: ['vegan'] },
    { name: '  ', startLocation: { latitude: 37.76, longitude: -122.42 }, interestTags: [], foodPrefs: [] },
  ]
  const rows = memberRows(members)
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0], {
    name: 'Ana', startLabel: 'SoMa, SF', startLat: 37.78, startLng: -122.41,
    interestTags: ['art'], foodPrefs: ['sushi'], diets: ['vegan'],
  })
  // Blank name falls back; missing label/diet default cleanly.
  assert.equal(rows[1].name, 'Member')
  assert.equal(rows[1].startLabel, null)
  assert.deepEqual(rows[1].diets, [])
})

test('memberRows returns [] for missing/empty members', () => {
  assert.deepEqual(memberRows(undefined), [])
  assert.deepEqual(memberRows([]), [])
})

test('constraintColumns: full window + valid transport + meeting point persist as-is', () => {
  const out = constraintColumns({
    timeWindow: { startTime: '09:00', endTime: '18:00' },
    maxBudgetPerPerson: 80, travelRadius: 5, transport: 'walking',
    meetingPoint: { latitude: 37.77, longitude: -122.41 },
  }, '2026-07-15')
  assert.equal(out.dayStart, '09:00')
  assert.equal(out.dayEnd, '18:00')
  assert.equal(out.transport, 'walking')
  assert.equal(out.meetingPointLat, 37.77)
  assert.equal(out.meetingPointLng, -122.41)
})

test('constraintColumns: half-set window is dropped to both-null', () => {
  const out = constraintColumns({ timeWindow: { startTime: '09:00' } }, null)
  assert.equal(out.dayStart, null)
  assert.equal(out.dayEnd, null)
})

test('constraintColumns: unknown transport is nulled (implied-enum guard)', () => {
  const out = constraintColumns({ transport: 'teleport' }, null)
  assert.equal(out.transport, null)
})

test('constraintColumns: half-set meeting point is dropped to both-null', () => {
  const out = constraintColumns({ meetingPoint: { latitude: 37.77 } }, null)
  assert.equal(out.meetingPointLat, null)
  assert.equal(out.meetingPointLng, null)
})

test('memberRows: a member with only one coordinate stores neither', () => {
  const [row] = memberRows([
    { name: 'Ana', startLocation: { latitude: 37.78 }, interestTags: [], foodPrefs: [] },
  ])
  assert.equal(row.startLat, null)
  assert.equal(row.startLng, null)
})
