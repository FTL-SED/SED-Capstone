// Pure primitives for the recommendation engine. Every function here is
// side-effect free and operates only on plain objects passed in — no DB, no
// Express — so each is independently unit-testable (see helpers.test.js).
// Composed by the hard filters (Step 3) and soft score (Step 4).
//
// Assumed normalized shapes (an OSM parser produces these upstream):
//   pin  = { name, category, tags[], cuisine[]?, diet[]?, priceLevel?,
//              rating?, openingHours? }
//     openingHours = [ { open: 'HH:MM', close: 'HH:MM' }, ... ] | null
//     diet         = list of diets the pin can serve, e.g. ['vegetarian']
//   member = { name, interestTags[], foodPrefs[], diet[]? }

import { PRICE_LEVEL_USD } from '../../../config/recommendation.js'
import { haversineMiles } from '../../../utils/geo.js'

// True if the pin carries at least one of the group's interest tags. Used to
// keep activities relevant to what the group actually likes.
function shareTag(pinTags, groupTagsSet) {
  if (!pinTags || pinTags.length === 0) return false
  return pinTags.some((tag) => groupTagsSet.has(tag))
}

// True if the pin's cuisine overlaps a member's food preferences. Drives the
// restaurant side of the soft score (a sushi-loving group floats sushi up).
function overlap(pinCuisine, memberFoodPrefs) {
  if (!pinCuisine || pinCuisine.length === 0) return false
  if (!memberFoodPrefs || memberFoodPrefs.length === 0) return false
  const prefs = new Set(memberFoodPrefs)
  return pinCuisine.some((c) => prefs.has(c))
}

// True if this restaurant can serve one member's dietary needs. A member with
// no diet can eat anywhere; a restaurant with unknown diet data is assumed
// edible (missing data ⇒ keep, never silently exclude).
function memberCanEat(pin, member) {
  const needs = member.diet ?? []
  if (needs.length === 0) return true
  if (!pin.diet) return true // unknown ⇒ assume it can serve them
  const offered = new Set(pin.diet)
  return needs.every((d) => offered.has(d))
}

// Diet filter for food pins. Keep a restaurant if it can serve AT LEAST ONE
// member's diet — drop only when it can serve nobody in the group. (Whole-group
// coverage is preferred via scoring + a coverage fallback, not by dropping every
// restaurant that can't feed everyone — that emptied the meal pool for mixed
// diets.) Unknown diet data ⇒ keep.
function passesDiet(pin, members) {
  return members.some((m) => memberCanEat(pin, m))
}

// Estimated per-person cost. Prefers an already-known exact price (e.g. from
// a seeded Pin) over the priceLevel (0-4) bucket estimate; null if neither is
// known.
function estPricePerPerson(pin) {
  if (typeof pin.pricePerPerson === 'number') return pin.pricePerPerson
  if (pin.priceLevel == null) return null
  return PRICE_LEVEL_USD[pin.priceLevel] ?? null
}

// Sanity budget check: drop a pin only if one person's visit alone already
// blows the whole per-person budget. Unknown price ⇒ keep (real budget
// enforcement happens by summing the chosen itinerary, not here).
function budgetSanityOk(pin, trip) {
  const price = estPricePerPerson(pin)
  if (price == null) return true
  return price <= trip.maxBudgetPerPerson
}

// Convert 'HH:MM' to minutes since midnight for interval comparison.
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// True if the pin is open at some point within [startTime, endTime].
// Unknown hours ⇒ true (Step 3 keeps it and attaches an `hoursUnknown` flag
// rather than dropping — missing data must never silently kill a pin).
function isOpenInWindow(pin, startTime, endTime) {
  if (!pin.openingHours || pin.openingHours.length === 0) return true
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  return pin.openingHours.some(({ open, close }) => {
    return toMinutes(open) < end && toMinutes(close) > start
  })
}

// True if the pin is within `travelRadius` miles of the meeting point. Unlike
// price/hours, coordinates are always known, so this is a plain hard check with
// no "unknown ⇒ keep" escape hatch (Stage 0 radius filter).
function withinRadius(pin, center, travelRadius) {
  return haversineMiles(pin, center) <= travelRadius
}

// Stable identity for dedup/membership checks: prefer the DB id, fall back to
// name. Shared by assemble.js and fairness.js so they agree on "same pin".
function pinIdentity(pin) {
  return pin.id ?? pin.name
}

export {
  shareTag,
  overlap,
  passesDiet,
  memberCanEat,
  estPricePerPerson,
  budgetSanityOk,
  isOpenInWindow,
  toMinutes,
  withinRadius,
  pinIdentity,
}
