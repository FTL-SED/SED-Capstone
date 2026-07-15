// Step 9 entry point: Route -> Controller -> here -> lib/prisma.
// Loads the seeded pin catalog, then runs it through the pure recommend()
// pipeline. This file is the only part of the recommendation engine allowed
// to touch the DB — recommend() and everything under recommend/, score/,
// filters/, etc. stay pure and DB-free (see .claude/rules/backend.md).
import { getAllPins } from './pinsRepository/pinsRepository.js'
import { recommend } from './recommend/recommend.js'
import { geocodeMembers } from '../../lib/geocode.js'

async function getRecommendations(trip, members) {
  // Resolve each member's typed start address to coordinates (Mapbox) so
  // Stage 0's meeting point + travel-radius filter can run. Throws a tagged
  // GEOCODE_FAILED error (surfaced as 422 by the controller) if an address
  // can't be located. Kept in the service — the engine stays network-free.
  const geocodedMembers = await geocodeMembers(members)
  const pins = await getAllPins()
  return recommend(trip, geocodedMembers, pins)
}

export { getRecommendations }
