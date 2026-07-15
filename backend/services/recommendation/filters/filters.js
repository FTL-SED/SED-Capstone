// Stage 1 of the recommendation engine: the hard filters. Composes the pure
// primitives in helpers.js into the candidate filter described in
// ../../../../.claude/docs/recommendation-engine.md (the "Hard filters" table).
//
// Guiding rule: a pin is dropped ONLY when it fails a real constraint. Missing
// data must never silently kill a pin — instead we keep it and attach a flag
// (`priceUnknown` / `hoursUnknown`) so downstream steps (and the AI) know the
// data is soft. Pure: no DB, no Express — everything is passed in.

import {
  shareTag,
  passesDiet,
  estPricePerPerson,
  budgetSanityOk,
  isOpenInWindow,
} from '../helpers/helpers.js'

const isRestaurant = (pin) => pin.category === 'restaurant'

const hasNoHours = (pin) =>
  !pin.openingHours || pin.openingHours.length === 0

// Filter seeded pins down to the eligible candidate pool for a trip.
//   pins  = normalized pin objects (see helpers.js for the shape)
//   members = [ { interestTags[], foodPrefs[], diet[]? }, ... ]
//   trip    = { startTime, endTime, maxBudgetPerPerson, ... }
// Returns { candidates, flags }: candidates are shallow copies carrying
// per-pin `priceUnknown` / `hoursUnknown` booleans; flags aggregates the
// names of pins with missing data for visibility.
function hardFilter(pins, members, trip) {
  const groupTags = new Set(members.flatMap((m) => m.interestTags ?? []))
  const candidates = []
  const flags = { priceUnknown: [], hoursUnknown: [] }

  for (const pin of pins) {
    // Relevance: restaurants are the meal pool (always eligible, diet-gated);
    // activities must overlap the group's combined interests or they're noise.
    const relevant = isRestaurant(pin)
      ? passesDiet(pin, members)
      : shareTag(pin.tags, groupTags)
    if (!relevant) continue

    // Budget sanity: drop only if one person's visit alone blows the whole
    // per-person budget. Real enforcement is summing the chosen itinerary.
    if (!budgetSanityOk(pin, trip)) continue

    // Hours: drop only when data exists AND the pin can't open in the window.
    // Unknown hours are kept and flagged, never dropped.
    const hoursUnknown = hasNoHours(pin)
    if (!hoursUnknown && !isOpenInWindow(pin, trip.startTime, trip.endTime)) {
      continue
    }

    const priceUnknown = estPricePerPerson(pin) == null
    if (priceUnknown) flags.priceUnknown.push(pin.name)
    if (hoursUnknown) flags.hoursUnknown.push(pin.name)

    candidates.push({ ...pin, priceUnknown, hoursUnknown })
  }

  return { candidates, flags }
}

export { hardFilter }
