// Pure primitives for the recommendation engine. Every function here is
// side-effect free and operates only on plain objects passed in — no DB, no
// Express — so each is independently unit-testable (see helpers.test.js).
// Composed by the hard filters (Step 3) and soft score (Step 4).
//
// Assumed normalized shapes (an OSM parser produces these upstream):
//   place  = { name, category, tags[], cuisine[]?, diet[]?, priceLevel?,
//              rating?, openingHours? }
//     openingHours = [ { open: 'HH:MM', close: 'HH:MM' }, ... ] | null
//     diet         = list of diets the place can serve, e.g. ['vegetarian']
//   member = { name, interestTags[], foodPrefs[], diet[]? }

const { PRICE_LEVEL_USD } = require('../../config/recommendation')

// True if the place carries at least one of the group's interest tags. Used to
// keep activities relevant to what the group actually likes.
function shareTag(placeTags, groupTagsSet) {
  if (!placeTags || placeTags.length === 0) return false
  return placeTags.some((tag) => groupTagsSet.has(tag))
}

// True if the place's cuisine overlaps a member's food preferences. Drives the
// restaurant side of the soft score (a sushi-loving group floats sushi up).
function overlap(placeCuisine, memberFoodPrefs) {
  if (!placeCuisine || placeCuisine.length === 0) return false
  if (!memberFoodPrefs || memberFoodPrefs.length === 0) return false
  const prefs = new Set(memberFoodPrefs)
  return placeCuisine.some((c) => prefs.has(c))
}

// Hard dietary filter for food places. A restaurant is a shared group meal, so
// it must be able to serve EVERY dietary restriction present in the group.
// Unknown diet data ⇒ keep (don't silently drop on missing data).
function passesDiet(place, members) {
  const required = new Set(members.flatMap((m) => m.diet ?? []))
  if (required.size === 0) return true
  if (!place.diet) return true // unknown ⇒ keep
  const offered = new Set(place.diet)
  return [...required].every((d) => offered.has(d))
}

// Estimated per-person cost from the tunable price table, or null if unknown.
function estPricePerPerson(place) {
  if (place.priceLevel == null) return null
  return PRICE_LEVEL_USD[place.priceLevel] ?? null
}

// Sanity budget check: drop a place only if one person's visit alone already
// blows the whole per-person budget. Unknown price ⇒ keep (real budget
// enforcement happens by summing the chosen itinerary, not here).
function budgetSanityOk(place, trip) {
  const price = estPricePerPerson(place)
  if (price == null) return true
  return price <= trip.maxBudgetPerPerson
}

// Convert 'HH:MM' to minutes since midnight for interval comparison.
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// True if the place is open at some point within [startTime, endTime].
// Unknown hours ⇒ true (Step 3 keeps it and attaches an `hoursUnknown` flag
// rather than dropping — missing data must never silently kill a place).
function isOpenInWindow(place, startTime, endTime) {
  if (!place.openingHours || place.openingHours.length === 0) return true
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  return place.openingHours.some(({ open, close }) => {
    return toMinutes(open) < end && toMinutes(close) > start
  })
}

module.exports = {
  shareTag,
  overlap,
  passesDiet,
  estPricePerPerson,
  budgetSanityOk,
  isOpenInWindow,
}
