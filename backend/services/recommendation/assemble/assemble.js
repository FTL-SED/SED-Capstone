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
import { toMinutes, pinIdentity } from '../helpers/helpers.js'

// Only category === "restaurant" counts against the food quota. Treats
// (coffee/dessert/boba) live under other categories (e.g. "cafe") and are
// treated as ordinary activities the user explicitly picked.
const isRestaurant = (pin) => pin.category === 'restaurant'

// Estimate how many stops fit the trip's time window, then give the AI a
// multiple of that many options to choose from (see AVG_STOP_DURATION_MIN /
// SHORTLIST_MULTIPLIER in config). Floored at FOOD_MIN so a very short window
// can't produce a shortlist too small to even satisfy the meal floor.
//
// This is a CEILING, not a guarantee: the actual shortlist can be smaller when
// the candidate pool is thin — e.g. Stage 0's travel-radius drop, a sparse
// catalog, or narrow group interests leave fewer eligible pins than this target.
function computeShortlistSize(trip) {
  const start = toMinutes(trip.startTime)
  const end = toMinutes(trip.endTime)
  // Missing/unparseable times (toMinutes ⇒ null) or a non-positive window
  // (end ≤ start, e.g. an overnight/inverted range the engine doesn't model)
  // collapse to 0 usable minutes — we still return the FOOD_MIN floor so the
  // shortlist is never empty for a bad window.
  const windowMinutes =
    start == null || end == null ? 0 : Math.max(0, end - start)
  const stops = windowMinutes / AVG_STOP_DURATION_MIN
  return Math.max(FOOD_MIN, Math.round(stops * SHORTLIST_MULTIPLIER))
}

// Walk the ranked (score-descending) list, taking pins up to shortlistSize
// while capping restaurants at FOOD_MAX so food can't crowd out activities.
// If that pass leaves food below FOOD_MIN (e.g. a "parks + museums, no food
// prefs" group whose restaurants all ranked low), float-fill with the
// best-rated remaining restaurants from the full `candidates` pool so the AI
// always has meal options — even beyond shortlistSize if it must.
function assembleWithFoodQuota(ranked, candidates, shortlistSize) {
  const shortlist = []
  let food = 0

  for (const pin of ranked) {
    const isFood = isRestaurant(pin)
    if (isFood && food >= FOOD_MAX) continue
    shortlist.push(pin)
    if (isFood) food++
    if (shortlist.length >= shortlistSize) break
  }

  if (food < FOOD_MIN) {
    const already = new Set(shortlist.map(pinIdentity))
    const remainingRestaurants = candidates
      .filter((p) => isRestaurant(p) && !already.has(pinIdentity(p)))
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))

    for (const pin of remainingRestaurants) {
      if (food >= FOOD_MIN) break
      shortlist.push(pin)
      food++
    }
  }

  return shortlist
}

export { computeShortlistSize, assembleWithFoodQuota }
