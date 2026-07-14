// Step 6 — food quota + shortlist assembly. Turns one ranked, scored list of
// candidates into the final shortlist the AI sequences: activities lead, but
// meals are bounded to a quota so they neither dominate nor disappear. Per
// ../../../../.claude/docs/recommendation-engine.md ("One ranked shortlist with a
// food quota"). Pure: no DB, no Express.

import {
  FOOD_MIN,
  FOOD_MAX,
  AVG_STOP_DURATION_MIN,
  SHORTLIST_MULTIPLIER,
} from '../../../config/recommendation.js'
import { toMinutes } from '../helpers/helpers.js'

// Only category === "restaurant" counts against the food quota. Treats
// (coffee/dessert/boba) live under other categories (e.g. "cafe") and are
// treated as ordinary activities the user explicitly picked.
const isRestaurant = (place) => place.category === 'restaurant'

const identity = (place) => place.id ?? place.name

// Estimate how many stops fit the trip's time window, then give the AI a
// multiple of that many options to choose from (see AVG_STOP_DURATION_MIN /
// SHORTLIST_MULTIPLIER in config). Floored at FOOD_MIN so a very short window
// can't produce a shortlist too small to even satisfy the meal floor.
function computeShortlistSize(trip) {
  const windowMinutes = Math.max(
    0,
    toMinutes(trip.endTime) - toMinutes(trip.startTime)
  )
  const stops = windowMinutes / AVG_STOP_DURATION_MIN
  return Math.max(FOOD_MIN, Math.round(stops * SHORTLIST_MULTIPLIER))
}

// Walk the ranked (score-descending) list, taking places up to shortlistSize
// while capping restaurants at FOOD_MAX so food can't crowd out activities.
// If that pass leaves food below FOOD_MIN (e.g. a "parks + museums, no food
// prefs" group whose restaurants all ranked low), float-fill with the
// best-rated remaining restaurants from the full `candidates` pool so the AI
// always has meal options — even beyond shortlistSize if it must.
function assembleWithFoodQuota(ranked, candidates, shortlistSize) {
  const shortlist = []
  let food = 0

  for (const place of ranked) {
    const isFood = isRestaurant(place)
    if (isFood && food >= FOOD_MAX) continue
    shortlist.push(place)
    if (isFood) food++
    if (shortlist.length >= shortlistSize) break
  }

  if (food < FOOD_MIN) {
    const already = new Set(shortlist.map(identity))
    const remainingRestaurants = candidates
      .filter((p) => isRestaurant(p) && !already.has(identity(p)))
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))

    for (const place of remainingRestaurants) {
      if (food >= FOOD_MIN) break
      shortlist.push(place)
      food++
    }
  }

  return shortlist
}

export { computeShortlistSize, assembleWithFoodQuota }
