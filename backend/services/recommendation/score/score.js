// Stage 2 of the recommendation engine: the soft score. Ranks the survivors of
// Stage 1 (filters.js) on one normalized 0–1 scale, per
// ../../../../.claude/docs/recommendation-engine.md ("Stage 2 — Soft score").
//
// Two matching signals, one score: activities are scored on interest-tag
// overlap, restaurants on cuisine overlap — so both land on the same scale and
// rank together in a single list. Pure: no DB, no Express.

import {
  WEIGHTS, INTENSITY_SATURATION, QUALITY_DEFAULT,
  VALUE_NEUTRAL, VALUE_BAND, VALUE_OVER_CUTOFF, VALUE_FLOOR,
} from '../../../config/recommendation.js'
import { shareTag, overlap, memberCanEat, memberInterestSet, isRestaurant, estPricePerPerson } from '../helpers/helpers.js'

// Budget-utilization value in [0,1] around a PER-STOP price target (the fair
// share of the budget for one stop = budget ÷ number of stops the day will
// have). Shape:
//   • within ±VALUE_BAND of the target        → full credit (1)
//   • above the band, up to VALUE_OVER_CUTOFF× → tapers linearly toward 0, so a
//     single budget-hogging pin ranks BELOW right-sized ones
//   • at/above VALUE_OVER_CUTOFF× the target   → 0
//   • below the band, down to $0              → scales from full credit to
//     VALUE_FLOOR (a cheap/free stop is fine, just slightly under-using budget)
// Missing price or no target ⇒ VALUE_NEUTRAL (missing data isn't punished).
function valueScore(pin, perStopTarget) {
  const price = estPricePerPerson(pin)
  if (price == null || typeof perStopTarget !== 'number' || perStopTarget <= 0) {
    return VALUE_NEUTRAL
  }
  const lo = perStopTarget * (1 - VALUE_BAND)
  const hi = perStopTarget * (1 + VALUE_BAND)
  if (price >= lo && price <= hi) return 1
  if (price < lo) {
    // 0 → VALUE_FLOOR, lo → 1 (linear)
    return VALUE_FLOOR + (1 - VALUE_FLOOR) * (price / lo)
  }
  // price > hi: hi → 1, cutoff → 0 (linear, clamped)
  const cutoff = perStopTarget * VALUE_OVER_CUTOFF
  if (price >= cutoff) return 0
  return Math.max(0, (cutoff - price) / (cutoff - hi))
}

// True if this one member would "like" the pin — cuisine match for
// restaurants, interest-tag match for everything else. A member can only "like"
// a restaurant they can actually eat at (diet), so coverage naturally floats
// whole-group-eatable restaurants above ones that exclude some members — the
// shared-meal preference, without a hard "must feed everyone" drop. Exported so
// the fairness guarantee (Step 5) reuses the exact same notion of "liked".
function memberLikes(pin, member) {
  if (isRestaurant(pin)) {
    return memberCanEat(pin, member) && overlap(pin.cuisine, member)
  }
  // memberInterestSet is memoized on the member, so this Set is built once per
  // member per run, not rebuilt for every pin.
  return shareTag(pin.interests ?? [], memberInterestSet(member))
}

// Members who'd "like" this pin — cuisine match for restaurants, interest-tag
// match for everything else (activities, treats).
function membersWhoLike(pin, members) {
  return members.filter((m) => memberLikes(pin, m))
}

// How many of the group's combined tags/cuisines this pin actually matches.
// Feeds intensity — the strength of the match, independent of who it's for.
function matchCount(pin, groupTags, groupFood) {
  if (isRestaurant(pin)) {
    return (pin.cuisine ?? []).filter((c) => groupFood.has(c)).length
  }
  return (pin.interests ?? []).filter((t) => groupTags.has(t)).length
}

// score(pin) = 0.5*coverage + 0.3*intensity + 0.2*quality (weights configurable).
//   coverage  = fraction of the group who'd like it (fairness signal).
//   intensity = min(1, matches / INTENSITY_SATURATION) — strength of match.
//   quality   = rating/5, or QUALITY_DEFAULT when unrated (missing data ⇒ neutral).
// `perStopTarget` is the fair per-person price for a single stop
// (budget ÷ estimated stops); see valueScore. Undefined ⇒ value is neutral.
function softScore(pin, members, groupTags, groupFood, perStopTarget) {
  const liked = membersWhoLike(pin, members)
  // Guard against an empty group: 0/0 would be NaN and poison the whole ranking.
  const coverage = members.length > 0 ? liked.length / members.length : 0

  const matched = matchCount(pin, groupTags, groupFood)
  const intensity = Math.min(1, matched / INTENSITY_SATURATION)

  const quality = pin.rating != null ? pin.rating / 5 : QUALITY_DEFAULT

  const value = valueScore(pin, perStopTarget)

  return (
    WEIGHTS.coverage * coverage +
    WEIGHTS.intensity * intensity +
    WEIGHTS.quality * quality +
    WEIGHTS.value * value
  )
}

export { softScore, memberLikes }
