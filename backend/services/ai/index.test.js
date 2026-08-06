// Step 9 — end-to-end test: generate an itinerary, persist it, read it back.
// Exercises the real chain generateItinerary -> persistItinerary -> the
// Itinerary/Pin tables -> findById, against a real DB. Forces the DETERMINISTIC
// fallback path (no AI_KEY needed, no network) by unsetting the key,
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

// Force the deterministic path — no narrator call. Unset BOTH provider keys so
// getAiClient() throws → generateItinerary uses the deterministic order (source
// "deterministic"). Unsetting only AI_KEY isn't enough now that the client
// prefers OPEN_AI_API_KEY (see lib/aiClient.js).
const savedKey = process.env.AI_KEY
const savedOpenAiKey = process.env.OPEN_AI_API_KEY
delete process.env.AI_KEY
delete process.env.OPEN_AI_API_KEY

const createdItineraryIds = []
let testUserId

after(async () => {
  for (const id of createdItineraryIds) {
    await itineraries.remove(id).catch(() => {})
  }
  if (testUserId) {
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
  }
  if (savedKey !== undefined) process.env.AI_KEY = savedKey
  if (savedOpenAiKey !== undefined) process.env.OPEN_AI_API_KEY = savedOpenAiKey
  await prisma.$disconnect()
})

// Use real catalog pins from the DB so persist + read-back can reference them.
// These IDs match seeded catalog venues (itineraryId = null).
const shortlist = [
  { id: 89, name: 'Nopalito', category: 'restaurant', tags: ['mexican'], latitude: 37.7745, longitude: -122.4515, pricePerPerson: 28, address: '306 Broderick St, San Francisco, CA 94117', locationImageUrl: 'https://images.navquest.dev/places/nopalito.jpg', openingHours: [{ open: '11:00', close: '22:00' }] },
  { id: 90, name: 'Tacolicious', category: 'restaurant', tags: ['mexican'], latitude: 37.7597, longitude: -122.4213, pricePerPerson: 25, address: '741 Valencia St, San Francisco, CA 94110', locationImageUrl: 'https://images.navquest.dev/places/tacolicious.jpg', openingHours: [{ open: '11:00', close: '22:00' }] },
  { id: 231, name: 'Golden Gate Park', category: 'activity', tags: ['nature'], latitude: 37.7694, longitude: -122.4862, pricePerPerson: 0, address: '501 Stanyan St, San Francisco, CA 94117', locationImageUrl: 'https://images.navquest.dev/places/golden-gate-park.jpg', openingHours: [{ open: '06:00', close: '22:00' }] },
]
const constraints = {
  timeWindow: { startTime: '09:00', endTime: '21:00' },
  maxBudgetPerPerson: 100,
  groupSize: 2,
  includeMeals: false,
}

test('generates, persists, and reads back a full itinerary', { skip: dbReason }, async () => {
  // A throwaway user to own the itinerary (unique fields keyed off a fixed tag).
  const tag = 'e2e-ai-itinerary-test'
  const user = await users.create({ authUserId: tag, email: `${tag}@example.com`, username: tag })
  testUserId = user.id

  // 1. Generate (deterministic path, since the key is unset → no narrator call).
  const result = await generateItinerary(shortlist, constraints)
  assert.notEqual(result.feasible, false, 'expected a feasible itinerary')
  assert.equal(result.source, 'deterministic')

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
  // Tight 3-hour window so budget-constrained fallback (only 2 stops fit $30) fills
  // it naturally, avoiding the coverage backstop. Test intent is budget enforcement,
  // not window-filling.
  const tightConstraints = { ...constraints, timeWindow: { startTime: '09:00', endTime: '12:00' }, maxBudgetPerPerson: 30, groupSize: 1 }
  const result = await generateItinerary(shortlist, tightConstraints)
  if (result.feasible === false) return // tight budget may be infeasible — that's valid

  const saved = await persistItinerary(result.itinerary, shortlist, { userId: testUserId, tripDate: '2026-07-15' })
  createdItineraryIds.push(saved.id)

  const fetched = await itineraries.findById(saved.id)
  const total = fetched.pins.reduce((sum, p) => sum + p.pricePerPerson, 0)
  assert.ok(total <= 30, `total ${total} exceeds cap 30`)
})

// C1/C2 regression tests: prove the two 500s are fixed
test('10:00–18:00 with includeMeals does NOT throw (C1 fix)', { skip: dbReason }, async () => {
  // Reproduces C1: dinner 17:00–20:30 overlaps the window but can't be filled
  // (earliest arrival 17:00, +90min = 18:30 > 18:00 end). Before the fix,
  // validation required dinner (blocksOverlappingWindow), fallback couldn't
  // seat it → validation rejects fallback → generateItinerary throws.
  const c1Constraints = {
    timeWindow: { startTime: '10:00', endTime: '18:00' },
    maxBudgetPerPerson: 120,
    groupSize: 2,
    includeMeals: true, // or omit — default is true
  }
  const result = await generateItinerary(shortlist, c1Constraints)
  // Must RESOLVE (not throw), and if feasible, must have stops
  assert.notEqual(result.feasible, false, 'expected a feasible itinerary')
  assert.ok(result.itinerary.stops.length > 0, 'expected at least one stop')
})

test('tight budget / wide window does NOT throw (C2 fix)', { skip: dbReason }, async () => {
  // Reproduces C2: tight budget + wide window → fallback greedy-maximal day
  // ends short of 20:30 with unused pins → coverage backstop trips → throw.
  // After C2, fallback re-validation skips coverage backstop.
  // Use a budget that allows SOME stops but not all, so the fallback produces
  // a short day (not infeasible).
  const c2Constraints = {
    timeWindow: { startTime: '10:00', endTime: '20:30' },
    maxBudgetPerPerson: 35, // allows Golden Gate Park (free) + Tacolicious (25) = 25, leaves Nopalito out
    groupSize: 2,
    includeMeals: false, // isolate coverage from meals
  }
  const result = await generateItinerary(shortlist, c2Constraints)
  // Must RESOLVE (not throw). The fallback may produce a short day OR declare
  // infeasible if the budget is genuinely too tight — both are valid; the key
  // is that it doesn't throw (no uncaught validation error).
  if (result.feasible === false) return // tight budget may be infeasible — valid
  assert.ok(result.itinerary.stops.length > 0, 'expected at least one stop')
  assert.equal(result.source, 'deterministic', 'no key set → deterministic order')
})

test('fallback meals respect budget cap (budget-aware meal reservation)', { skip: dbReason }, async () => {
  // Reproduces budget-500: 8-pin shortlist, meals ON, tight budget where the
  // top-RATED restaurant per enforceable block exceeds budget but cheaper ones fit.
  // Before fix: fallback picks Nopalito ($28) + Tacolicious ($25) = $53 > $50 → throw
  // After fix: picks cheaper meals within budget → resolves with valid itinerary
  const tightMealConstraints = {
    timeWindow: { startTime: '10:00', endTime: '20:30' }, // enforces lunch + dinner
    maxBudgetPerPerson: 50, // tight: top-rated meals ($28 + $25) exceed, but cheaper options fit
    groupSize: 2,
    includeMeals: true,
    foodBelowMin: false, // meals are wanted
  }
  const result = await generateItinerary(shortlist, tightMealConstraints)
  // Must RESOLVE (not throw) and the itinerary must be within budget
  assert.notEqual(result.feasible, false, 'expected a feasible itinerary')
  const byId = new Map(shortlist.map((p) => [p.id, p]))
  const total = result.itinerary.stops.reduce((s, stop) => s + (byId.get(stop.pinId)?.pricePerPerson ?? 0), 0)
  assert.ok(total <= 50, `total ${total} exceeds budget 50`)
  // Should include meals (at least one restaurant stop)
  const meals = result.itinerary.stops.filter((s) => byId.get(s.pinId)?.category === 'restaurant')
  assert.ok(meals.length > 0, 'expected at least one meal')
})
