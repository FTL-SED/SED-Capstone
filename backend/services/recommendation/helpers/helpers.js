// Pure primitives for the recommendation engine. No DB, no Express, so each is
// independently unit-testable (see helpers.test.js). Composed by the hard
// filters (Step 3) and soft score (Step 4).
//
// One deliberate exception to "purely functional": memberInterestSet/
// memberFoodSet memoize a Set onto the member under a NON-ENUMERABLE key
// (idempotent, invisible to JSON/spreads, output-neutral). It's a caching
// optimization for the (pins × members) scoring hot path, not observable
// behavior — members arrive fresh per request and aren't mutated mid-run.
//
// Assumed normalized shapes (mapVenue produces these from a Pin row):
//   pin  = { name, category, tags[], cuisine[]?, diet[]?, priceLevel?,
//              rating?, openingHours? }
//     openingHours has THREE meaningful states for the trip's day:
//       [ { open: 'HH:MM', close: 'HH:MM' }, ... ]  open — check overlap
//       null       — explicitly CLOSED that day (isClosedThisDay ⇒ hard drop)
//       undefined  — hours UNKNOWN (kept + flagged hoursUnknown, never dropped)
//     diet         = list of diets the pin can serve, e.g. ['vegetarian']
//   member = { name, interestTags[], foodPrefs[], diet[]? }

import { PRICE_LEVEL_USD, CATEGORY } from '../../../config/recommendation.js'
import { haversineMiles } from '../../../utils/geo.js'

// A pin is a restaurant (the meal pool) vs. an activity. Shared so the category
// literal lives in one place (config) and every module agrees on the check.
function isRestaurant(pin) {
  return pin.category === CATEGORY.restaurant
}

// True if the pin carries at least one of the group's interest tags. Used to
// keep activities relevant to what the group actually likes.
function shareTag(pinTags, groupTagsSet) {
  if (!pinTags || pinTags.length === 0) return false
  return pinTags.some((tag) => groupTagsSet.has(tag))
}

// A member's interest/food-pref values as a Set, memoized on the member object
// under a non-enumerable key. The scoring pass calls memberLikes for every
// (pin × member) pair, so without this each call rebuilt an identical Set from
// the same array — O(pins × members) throwaway allocations. Building it once
// per member and caching it makes the hot path O(members) instead. The cache
// key is non-enumerable so it never leaks into JSON responses or `...pin` spreads.
function cachedSet(obj, cacheKey, sourceKey) {
  let set = obj[cacheKey]
  if (set === undefined) {
    set = new Set(obj[sourceKey] ?? [])
    Object.defineProperty(obj, cacheKey, { value: set, enumerable: false, configurable: true })
  }
  return set
}

const memberInterestSet = (member) => cachedSet(member, '__interestSet', 'interestTags')
const memberFoodSet = (member) => cachedSet(member, '__foodSet', 'foodPrefs')

// True if the pin's cuisine overlaps a member's food preferences. Drives the
// restaurant side of the soft score (a sushi-loving group floats sushi up).
// Takes the member (not a raw array) so it can reuse the memoized food-pref Set.
function overlap(pinCuisine, member) {
  if (!pinCuisine || pinCuisine.length === 0) return false
  const prefs = memberFoodSet(member)
  if (prefs.size === 0) return false
  return pinCuisine.some((c) => prefs.has(c))
}

// True if this restaurant can serve one member's dietary needs. A member with
// no diet can eat anywhere; a restaurant with unknown diet data is assumed
// edible (missing data ⇒ keep, never silently exclude).
function memberCanEat(pin, member) {
  const needs = member.diet ?? []
  if (needs.length === 0) return true
  if (!pin.diet) return true // unknown ⇒ assume it can serve them
  // pin.diet is a short list (1-3 strings), so .includes beats allocating a Set
  // on every (restaurant × member) check in the scoring/filter/fairness passes.
  return needs.every((d) => pin.diet.includes(d))
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

// Convert 'HH:MM' to minutes since midnight for interval comparison, or null
// when the input isn't a valid HH:MM string (so callers can treat malformed
// data as "unknown" instead of silently comparing against NaN).
function toMinutes(hhmm) {
  if (typeof hhmm !== 'string') return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

// True if the pin is open at some point within [startTime, endTime].
// Unknown hours ⇒ true (Step 3 keeps it and attaches an `hoursUnknown` flag
// rather than dropping — missing data must never silently kill a pin). A pin
// whose hours can't be parsed is treated the same as unknown: we don't let a
// malformed interval silently drop it.
function isOpenInWindow(pin, startTime, endTime) {
  if (!pin.openingHours || pin.openingHours.length === 0) return true
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  if (start == null || end == null) return true // can't compare ⇒ treat as unknown

  // Keep only the intervals we can actually parse. If none parse, hours are
  // effectively unknown ⇒ keep (true); otherwise check overlap among the valid ones.
  const intervals = pin.openingHours
    .map(({ open, close }) => ({ openM: toMinutes(open), closeM: toMinutes(close) }))
    .filter(({ openM, closeM }) => openM != null && closeM != null)
  if (intervals.length === 0) return true
  return intervals.some(({ openM, closeM }) => openM < end && closeM > start)
}

// True if the pin has at least one well-formed opening-hours interval. A pin
// with no hours at all, or only malformed ones (e.g. "25:99"), has no usable
// hours — Stage 1 treats both as `hoursUnknown` (keep + flag, never drop).
function hasUsableHours(pin) {
  if (!pin.openingHours || pin.openingHours.length === 0) return false
  return pin.openingHours.some(
    ({ open, close }) => toMinutes(open) != null && toMinutes(close) != null
  )
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

// Explicitly closed on the trip day: mapVenue emits openingHours === null when
// the pin's hoursOpen marks that weekday closed. Distinct from `undefined`
// (unknown hours ⇒ keep) — a known-closed pin is a real hard drop.
function isClosedThisDay(pin) {
  return pin.openingHours === null
}

export {
  isRestaurant,
  shareTag,
  overlap,
  memberInterestSet,
  passesDiet,
  memberCanEat,
  estPricePerPerson,
  budgetSanityOk,
  isOpenInWindow,
  toMinutes,
  hasUsableHours,
  withinRadius,
  pinIdentity,
  isClosedThisDay,
}
