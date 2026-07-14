// Step 9 entry point: Route -> Controller -> here -> lib/prisma.
// Loads the seeded place catalog, then runs it through the pure recommend()
// pipeline. This file is the only part of the recommendation engine allowed
// to touch the DB — recommend() and everything under recommend/, score/,
// filters/, etc. stay pure and DB-free (see .claude/rules/backend.md).
import { getAllPlaces } from './placesRepository/placesRepository.js'
import { recommend } from './recommend/recommend.js'

async function getRecommendations(trip, members) {
  const places = await getAllPlaces()
  return recommend(trip, members, places)
}

export { getRecommendations }
