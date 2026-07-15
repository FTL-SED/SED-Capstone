// Step 9 entry point: Route -> Controller -> here -> lib/prisma.
// Loads the seeded pin catalog, then runs it through the pure recommend()
// pipeline. This file is the only part of the recommendation engine allowed
// to touch the DB — recommend() and everything under recommend/, score/,
// filters/, etc. stay pure and DB-free (see .claude/rules/backend.md).
import { getAllPins } from './pinsRepository/pinsRepository.js'
import { recommend } from './recommend/recommend.js'

async function getRecommendations(trip, members) {
  const pins = await getAllPins()
  return recommend(trip, members, pins)
}

export { getRecommendations }
