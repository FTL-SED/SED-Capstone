// Integration test for Step 9: runs the full pipeline (DB -> pinsRepository
// -> recommend()) against the REAL seeded `Pin` catalog, not mock data. This
// is what actually catches "the unit tests pass but real recommendations are
// broken/empty/over-budget" — the mock-group tests in recommend/ can't, since
// they supply their own pins.
//
// Skips (doesn't fail) when there's no reachable/seeded DB, so `npm test`
// stays green on a machine without a local Postgres set up — see Step 9 in
// ../../.claude/roadmap/recommendation-engine.md.
import 'dotenv/config'

import { test, after } from 'node:test'
import assert from 'node:assert/strict'

import prisma from '../../lib/prisma.js'
import { getRecommendations } from './index.js'
import { memberLikes } from './score/score.js'
import { estPricePerPerson } from './helpers/helpers.js'
import { FOOD_MAX } from '../../config/recommendation.js'

let dbReason // stays undefined (must NOT be null - node:test's `skip` treats null as truthy) when the DB is reachable and seeded
try {
  const count = await prisma.pin.count()
  if (count === 0) dbReason = 'no Pin rows seeded — run `npx prisma db seed`'
} catch {
  dbReason = 'no DATABASE_URL / Postgres unreachable'
}

after(async () => {
  await prisma.$disconnect()
})

const trip = { startTime: '09:00', endTime: '18:00', maxBudgetPerPerson: 60 }
// 'nature' (not 'hiking') deliberately - the only 'hiking'-tagged seeded Pin
// ("Hawk Hill") lives on a private draft itinerary and must NOT be
// reachable, so a fixture relying on it to prove fairness coverage would be
// testing the bug, not the feature. See the private-Pin test below.
//
// startLocation is given as coordinates (not a text address) so getRecommendations'
// geocoding step is a no-op passthrough — this integration test exercises the
// DB → engine path, not the Mapbox network call (geocoding is unit-tested in
// lib/geocode.test.js).
const members = [
  { name: 'Alex', startLocation: { latitude: 37.7749, longitude: -122.4194 }, interestTags: ['art', 'scenic_views'], foodPrefs: ['mexican'] },
  { name: 'Sam', startLocation: { latitude: 37.7599, longitude: -122.4148 }, interestTags: ['nature'], foodPrefs: ['ramen'] },
]

test(
  'getRecommendations against the real seeded Pin catalog returns a non-empty, well-formed shortlist',
  { skip: dbReason },
  async () => {
    const { shortlist, constraints } = await getRecommendations(trip, members)

    assert.ok(Array.isArray(shortlist))
    assert.ok(shortlist.length > 0, 'expected at least one recommended pin from the seeded catalog')
    assert.equal(constraints.groupSize, members.length)
    assert.deepEqual(constraints.startingLocations, members.map((m) => m.startLocation))

    for (const pin of shortlist) {
      assert.equal(typeof pin.name, 'string')
      assert.equal(typeof pin.latitude, 'number')
      assert.equal(typeof pin.longitude, 'number')
      assert.ok(pin.category === 'restaurant' || pin.category === 'activity')
    }
  }
)

test(
  'getRecommendations never lets a real pin through over budget',
  { skip: dbReason },
  async () => {
    const { shortlist } = await getRecommendations(trip, members)

    for (const pin of shortlist) {
      const price = estPricePerPerson(pin)
      assert.ok(
        price == null || price <= trip.maxBudgetPerPerson,
        `${pin.name} costs $${price}, over the $${trip.maxBudgetPerPerson} budget`
      )
    }
  }
)

test(
  'getRecommendations respects the food quota ceiling even on the small real catalog',
  { skip: dbReason },
  async () => {
    const { shortlist } = await getRecommendations(trip, members)
    const foodCount = shortlist.filter((p) => p.category === 'restaurant').length
    assert.ok(foodCount <= FOOD_MAX, `foodCount was ${foodCount}, over FOOD_MAX`)
    // Not asserting a FOOD_MIN floor here: the real catalog currently has only
    // a handful of restaurant-tagged Pins, so the floor-fill can legitimately
    // come up short. That's a data-richness gap, not an engine bug — see the
    // "quality report" script for visibility into this as the catalog grows.
  }
)

test(
  'getRecommendations covers a member whose interest exists in the real catalog',
  { skip: dbReason },
  async () => {
    const { shortlist } = await getRecommendations(trip, members)
    for (const member of members) {
      assert.ok(
        shortlist.some((pin) => memberLikes(pin, member)),
        `${member.name} has no liked pin in the real-data shortlist`
      )
    }
  }
)

test(
  'getRecommendations never surfaces a Pin from a private/draft itinerary, even for a strongly matching interest',
  { skip: dbReason },
  async () => {
    // "Hawk Hill" only exists on the seeded private draft itinerary
    // ("Weekend Draft: Marin Headlands", isPublic: false). A member whose
    // interests match it exactly must still never see it recommended - this
    // was a real leak (fixed by scoping getAllPins() to isPublic: true),
    // not a hypothetical.
    const hikerMember = [
      { name: 'Hiker', startLocation: { latitude: 37.7801, longitude: -122.4644 }, interestTags: ['hiking', 'scenic_views'], foodPrefs: [] },
    ]
    const { shortlist } = await getRecommendations(trip, hikerMember)
    assert.ok(
      !shortlist.some((pin) => pin.name === 'Hawk Hill'),
      'Hawk Hill (private draft itinerary) leaked into recommendations'
    )
  }
)
