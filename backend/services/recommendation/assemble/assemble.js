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
  VALUE_FALLBACK_SHARE,
} from '../../../config/recommendation.js'
import { toMinutes, pinIdentity, isRestaurant } from '../helpers/helpers.js'

// Only category === "restaurant" counts against the food quota. Treats
// (coffee/dessert/boba) live under other categories (e.g. "cafe") and are
// treated as ordinary activities the user explicitly picked.

// How many ~AVG_STOP_DURATION_MIN stops fit the trip's time window. 0 for a
// missing/inverted window. Shared by the shortlist sizer and the per-stop budget.
function estimatedStops(trip) {
  const start = toMinutes(trip?.startTime)
  const end = toMinutes(trip?.endTime)
  const windowMinutes = start == null || end == null ? 0 : Math.max(0, end - start)
  return windowMinutes / AVG_STOP_DURATION_MIN
}

// The fair per-person price for ONE stop: the budget spread evenly across the
// day's stops (budget ÷ estimatedStops). This is what the value score aims each
// pin at, so the day picks ~budget/N-priced places instead of grabbing one that
// eats most of the budget. Falls back to VALUE_FALLBACK_SHARE × budget when the
// window (hence stop count) is unknown. Null when budget isn't a positive number.
function perStopBudget(trip) {
  const budget = trip?.maxBudgetPerPerson
  if (typeof budget !== 'number' || budget <= 0) return null
  const stops = estimatedStops(trip)
  if (stops >= 1) return budget / stops
  return budget * VALUE_FALLBACK_SHARE
}

// Estimate how many stops fit the trip's time window, then give the AI a
// multiple of that many options to choose from (see AVG_STOP_DURATION_MIN /
// SHORTLIST_MULTIPLIER in config). Floored at FOOD_MIN so a very short window
// can't produce a shortlist too small to even satisfy the meal floor.
//
// This is a CEILING, not a guarantee: the actual shortlist can be smaller when
// the candidate pool is thin — e.g. Stage 0's travel-radius drop, a sparse
// catalog, or narrow group interests leave fewer eligible pins than this target.
function computeShortlistSize(trip) {
  return Math.max(FOOD_MIN, Math.round(estimatedStops(trip) * SHORTLIST_MULTIPLIER))
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

export { computeShortlistSize, assembleWithFoodQuota, estimatedStops, perStopBudget }
