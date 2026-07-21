// Step 9 entry point: Route -> Controller -> here -> lib/prisma.
// Loads the seeded pin catalog, then runs it through the pure recommend()
// pipeline. This file is the only part of the recommendation engine allowed
// to touch the DB — recommend() and everything under recommend/, score/,
// filters/, etc. stay pure and DB-free (see .claude/rules/backend.md).
import { getAllPins } from './pinsRepository/pinsRepository.js'
import { recommend } from './recommend/recommend.js'

async function getRecommendations(trip, members) {
  // Per-day hours need the trip's calendar day; default to a fixed day when the
  // caller omits it (matches services/itinerary/persist.js's fallback).
  const tripDate = trip?.tripDate ?? '2026-01-01'
  const pins = await getAllPins(tripDate)
  return recommend(trip, members, pins)
}

export { getRecommendations }
