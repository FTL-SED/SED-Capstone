// Recomputes an itinerary's per-person budget as the sum of its stops' effective
// per-person costs, and persists it onto Itinerary.maxBudgetPerPerson so the
// saved itinerary stays self-describing. Called after any change that affects the
// total (add/edit/delete stop). A stop's effective cost is its own
// `costPerPerson` override when set, else the shared venue Pin's `pricePerPerson`.
//
// This is multi-step domain logic (read stops → sum → write itinerary) that spans
// two tables, so it lives in a service rather than a controller or a single model
// (see .claude/rules/backend.md → Services).
import * as itineraryStops from '../../models/itineraryStops.js'
import * as itineraries from '../../models/itineraries.js'

// Sum the effective per-person cost across every stop. An itinerary with no stops
// has a budget of 0 (not null) — the day genuinely costs nothing yet.
function sumStopCosts(stops) {
  return stops.reduce((total, s) => {
    const effective = s.costPerPerson ?? s.pin?.pricePerPerson ?? 0
    return total + effective
  }, 0)
}

// Recalculate + persist. Returns the new per-person total.
async function recalcBudget(itineraryId) {
  const stops = await itineraryStops.findManyByItineraryWithPins(itineraryId)
  const total = sumStopCosts(stops)
  await itineraries.update(itineraryId, { maxBudgetPerPerson: total })
  return total
}

export { recalcBudget, sumStopCosts }
