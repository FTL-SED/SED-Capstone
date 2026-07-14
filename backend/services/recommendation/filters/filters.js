// Stage 1 of the recommendation engine: the hard filters. Composes the pure
// primitives in helpers.js into the candidate filter described in
// ../../../../.claude/docs/recommendation-engine.md (the "Hard filters" table).
//
// Guiding rule: a place is dropped ONLY when it fails a real constraint. Missing
// data must never silently kill a place — instead we keep it and attach a flag
// (`priceUnknown` / `hoursUnknown`) so downstream steps (and the AI) know the
// data is soft. Pure: no DB, no Express — everything is passed in.

import {
  shareTag,
  passesDiet,
  estPricePerPerson,
  budgetSanityOk,
  isOpenInWindow,
} from '../helpers/helpers.js'

const isRestaurant = (place) => place.category === 'restaurant'

const hasNoHours = (place) =>
  !place.openingHours || place.openingHours.length === 0

// Filter seeded places down to the eligible candidate pool for a trip.
//   places  = normalized place objects (see helpers.js for the shape)
//   members = [ { interestTags[], foodPrefs[], diet[]? }, ... ]
//   trip    = { startTime, endTime, maxBudgetPerPerson, ... }
// Returns { candidates, flags }: candidates are shallow copies carrying
// per-place `priceUnknown` / `hoursUnknown` booleans; flags aggregates the
// names of places with missing data for visibility.
function hardFilter(places, members, trip) {
  const groupTags = new Set(members.flatMap((m) => m.interestTags ?? []))
  const candidates = []
  const flags = { priceUnknown: [], hoursUnknown: [] }

  for (const place of places) {
    // Relevance: restaurants are the meal pool (always eligible, diet-gated);
    // activities must overlap the group's combined interests or they're noise.
    const relevant = isRestaurant(place)
      ? passesDiet(place, members)
      : shareTag(place.tags, groupTags)
    if (!relevant) continue

    // Budget sanity: drop only if one person's visit alone blows the whole
    // per-person budget. Real enforcement is summing the chosen itinerary.
    if (!budgetSanityOk(place, trip)) continue

    // Hours: drop only when data exists AND the place can't open in the window.
    // Unknown hours are kept and flagged, never dropped.
    const hoursUnknown = hasNoHours(place)
    if (!hoursUnknown && !isOpenInWindow(place, trip.startTime, trip.endTime)) {
      continue
    }

    const priceUnknown = estPricePerPerson(place) == null
    if (priceUnknown) flags.priceUnknown.push(place.name)
    if (hoursUnknown) flags.hoursUnknown.push(place.name)

    candidates.push({ ...place, priceUnknown, hoursUnknown })
  }

  return { candidates, flags }
}

export { hardFilter }
