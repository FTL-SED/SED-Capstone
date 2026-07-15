// Step 9 — end-to-end test: generate an itinerary, persist it, read it back.
// Exercises the real chain generateItinerary -> persistItinerary -> the
// Itinerary/Pin tables -> findById, against a real DB. Forces the DETERMINISTIC
// fallback path (no OPENROUTER_API_KEY needed, no network) by unsetting the key,
// so this proves persistence + retrieval without depending on a live model.
//
// Skips (doesn't fail) when no DB is reachable, matching
// services/recommendation/index.test.js — `npm test` stays green without a
// local Postgres.
import 'dotenv/config'

import { test, after } from 'node:test'
import assert from 'node:assert/strict'

import prisma from '../../lib/prisma.js'
import * as itineraries from '../../models/itineraries.js'
import * as users from '../../models/users.js'
import { generateItinerary } from './index.js'
import { persistItinerary } from '../itinerary/persist.js'

let dbReason // undefined when the DB is reachable (node:test treats null as truthy)
try {
  await prisma.user.count()
} catch {
  dbReason = 'no DATABASE_URL / Postgres unreachable'
}

// Force the fallback path — deterministic, no network/API key required.
const savedKey = process.env.OPENROUTER_API_KEY
delete process.env.OPENROUTER_API_KEY

const createdItineraryIds = []
let testUserId

after(async () => {
  for (const id of createdItineraryIds) {
    await itineraries.remove(id).catch(() => {})
  }
  if (testUserId) {
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
  }
  if (savedKey !== undefined) process.env.OPENROUTER_API_KEY = savedKey
  await prisma.$disconnect()
})

const shortlist = [
  { id: 101, name: 'Ferry Building', category: 'activity', tags: ['food'], latitude: 37.7955, longitude: -122.3937, pricePerPerson: 0, address: 'SF', locationImageUrl: 'ferry.jpg', openingHours: [{ open: '10:00', close: '18:00' }] },
  { id: 102, name: 'Tartine', category: 'restaurant', tags: ['bakery'], latitude: 37.7614, longitude: -122.4241, pricePerPerson: 25, address: 'SF', locationImageUrl: 'tartine.jpg', openingHours: [{ open: '08:00', close: '17:00' }] },
  { id: 103, name: 'Golden Gate Park', category: 'activity', tags: ['nature'], latitude: 37.7694, longitude: -122.4862, pricePerPerson: 0, address: 'SF', locationImageUrl: 'park.jpg', openingHours: [{ open: '06:00', close: '22:00' }] },
]
const constraints = {
  timeWindow: { startTime: '09:00', endTime: '21:00' },
  maxBudgetPerPerson: 100,
  groupSize: 2,
  startingLocations: ['Mission'],
}

test('generates, persists, and reads back a full itinerary', { skip: dbReason }, async () => {
  // A throwaway user to own the itinerary (unique fields keyed off a fixed tag).
  const tag = 'e2e-ai-itinerary-test'
  const user = await users.create({ authUserId: tag, email: `${tag}@example.com`, username: tag })
  testUserId = user.id

  // 1. Generate (fallback path, since the key is unset).
  const result = await generateItinerary(shortlist, constraints)
  assert.notEqual(result.feasible, false, 'expected a feasible itinerary')
  assert.equal(result.source, 'fallback')

  // 2. Persist.
  const saved = await persistItinerary(result.itinerary, shortlist, {
    userId: user.id,
    tripDate: '2026-07-15',
    isPublic: false,
  })
  createdItineraryIds.push(saved.id)
  assert.ok(Number.isInteger(saved.id))

  // 3. Read back via the model (what GET /itineraries/:id serves).
  const fetched = await itineraries.findById(saved.id)
  assert.ok(fetched, 'itinerary should be retrievable')
  assert.equal(fetched.title, result.itinerary.title)
  assert.equal(fetched.userId, user.id)

  // Pins persisted, ordered, and every one references a real shortlist place.
  assert.equal(fetched.pins.length, result.itinerary.stops.length)
  const shortlistNames = new Set(shortlist.map((p) => p.name))
  fetched.pins.forEach((pin, i) => {
    assert.equal(pin.orderInItinerary, i)
    assert.ok(shortlistNames.has(pin.name), `pin "${pin.name}" should be a real place`)
    assert.ok(pin.startTime instanceof Date)
    assert.ok(pin.endTime >= pin.startTime)
  })

  // Times round-tripped through the DB as real DateTimes (09:00 PDT = 16:00 UTC).
  assert.equal(fetched.pins[0].startTime.toISOString(), '2026-07-15T16:00:00.000Z')
})

test('respects the budget cap end-to-end', { skip: dbReason }, async () => {
  const result = await generateItinerary(shortlist, { ...constraints, maxBudgetPerPerson: 30, groupSize: 1 })
  if (result.feasible === false) return // tight budget may be infeasible — that's valid

  const saved = await persistItinerary(result.itinerary, shortlist, { userId: testUserId, tripDate: '2026-07-15' })
  createdItineraryIds.push(saved.id)

  const fetched = await itineraries.findById(saved.id)
  const total = fetched.pins.reduce((sum, p) => sum + p.pricePerPerson, 0)
  assert.ok(total <= 30, `total ${total} exceeds cap 30`)
})
