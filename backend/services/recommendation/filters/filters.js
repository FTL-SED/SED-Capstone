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
  hasUsableHours,
  withinRadius,
  isClosedThisDay,
} from '../helpers/helpers.js'
import { geometricMedian } from '../../../utils/geo.js'

const isRestaurant = (pin) => pin.category === 'restaurant'

// A member's start location is usable for the meeting point only when it carries
// numeric coordinates. The frontend resolves each address via its map/autocomplete
// picker and sends { latitude, longitude }; anything without coords is skipped.
const hasCoords = (m) =>
  m?.startLocation &&
  typeof m.startLocation.latitude === 'number' &&
  typeof m.startLocation.longitude === 'number'

// Filter seeded pins down to the eligible candidate pool for a trip.
//   pins  = normalized pin objects (see helpers.js for the shape)
//   members = [ { interestTags[], foodPrefs[], diet[]? }, ... ]
//   trip    = { startTime, endTime, maxBudgetPerPerson, ... }
// Returns { candidates, flags, meetingPoint, memberCoords }: candidates are
// shallow copies carrying per-pin `priceUnknown` / `hoursUnknown` booleans;
// flags aggregates the names of pins with missing data for visibility;
// meetingPoint is the fair group anchor (or null when it can't be computed);
// memberCoords is the list of usable member coordinates (reused downstream for
// the fairness metric, so recommend() doesn't re-derive it).
function hardFilter(pins, members, trip) {
  const groupTags = new Set(members.flatMap((m) => m.interestTags ?? []))
  const candidates = []
  const flags = { priceUnknown: [], hoursUnknown: [] }

  // If the group expressed no interests at all, there's nothing to judge
  // activity relevance against — so keep all activities and let quality (rating)
  // rank them, rather than filtering every activity out and leaving a
  // meals-only shortlist.
  const hasGroupInterests = groupTags.size > 0

  // Stage 0: fair meeting point from members with real coordinates, then the
  // travel-radius drop is measured from it. Both are no-ops (radius skipped)
  // when we lack coordinates or the trip sets no radius — so callers that omit
  // coordinates behave exactly as before.
  const memberCoords = members.filter(hasCoords).map((m) => m.startLocation)
  const meetingPoint = memberCoords.length > 0 ? geometricMedian(memberCoords) : null
  const applyRadius = meetingPoint !== null && typeof trip.travelRadius === 'number'

  for (const pin of pins) {
    // Relevance: restaurants are the meal pool (always eligible, diet-gated);
    // activities must overlap the group's combined interests or they're noise —
    // unless the group set no interests at all, in which case all activities
    // stay (ranked later by quality).
    const relevant = isRestaurant(pin)
      ? passesDiet(pin, members)
      : !hasGroupInterests || shareTag(pin.interests ?? [], groupTags)
    if (!relevant) continue

    // Travel radius: hard drop pins too far from the meeting point. No flag —
    // coordinates are always known, so this is never "missing data".
    if (applyRadius && !withinRadius(pin, meetingPoint, trip.travelRadius)) continue

    // Budget sanity: drop only if one person's visit alone blows the whole
    // per-person budget. Real enforcement is summing the chosen itinerary.
    if (!budgetSanityOk(pin, trip)) continue

    // Known-closed on the trip day (mapVenue emitted null): a real hard drop,
    // no flag. Distinct from unknown hours (undefined), handled below.
    if (isClosedThisDay(pin)) continue

    // Hours: drop only when usable hours exist AND the pin can't open in the
    // window. Missing OR malformed hours count as unknown — kept and flagged,
    // never dropped.
    const hoursUnknown = !hasUsableHours(pin)
    if (!hoursUnknown && !isOpenInWindow(pin, trip.startTime, trip.endTime)) {
      continue
    }

    const priceUnknown = estPricePerPerson(pin) == null
    if (priceUnknown) flags.priceUnknown.push(pin.name)
    if (hoursUnknown) flags.hoursUnknown.push(pin.name)

    candidates.push({ ...pin, priceUnknown, hoursUnknown })
  }

  return { candidates, flags, meetingPoint, memberCoords }
}

export { hardFilter }
