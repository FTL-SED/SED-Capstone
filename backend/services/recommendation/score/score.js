// Stage 2 of the recommendation engine: the soft score. Ranks the survivors of
// Stage 1 (filters.js) on one normalized 0–1 scale, per
// ../../../../.claude/docs/recommendation-engine.md ("Stage 2 — Soft score").
//
// Two matching signals, one score: activities are scored on interest-tag
// overlap, restaurants on cuisine overlap — so both land on the same scale and
// rank together in a single list. Pure: no DB, no Express.

import { WEIGHTS, INTENSITY_SATURATION, QUALITY_DEFAULT } from '../../../config/recommendation.js'
import { shareTag, overlap } from '../helpers/helpers.js'

const isRestaurant = (pin) => pin.category === 'restaurant'

// True if this one member would "like" the pin — cuisine match for
// restaurants, interest-tag match for everything else. Exported so the
// fairness guarantee (Step 5) can reuse the exact same notion of "liked".
function memberLikes(pin, member) {
  return isRestaurant(pin)
    ? overlap(pin.cuisine, member.foodPrefs)
    : shareTag(pin.tags, new Set(member.interestTags))
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
  return (pin.tags ?? []).filter((t) => groupTags.has(t)).length
}

// score(pin) = 0.5*coverage + 0.3*intensity + 0.2*quality (weights configurable).
//   coverage  = fraction of the group who'd like it (fairness signal).
//   intensity = min(1, matches / INTENSITY_SATURATION) — strength of match.
//   quality   = rating/5, or QUALITY_DEFAULT when unrated (missing data ⇒ neutral).
function softScore(pin, members, groupTags, groupFood) {
  const liked = membersWhoLike(pin, members)
  const coverage = liked.length / members.length

  const matched = matchCount(pin, groupTags, groupFood)
  const intensity = Math.min(1, matched / INTENSITY_SATURATION)

  const quality = pin.rating != null ? pin.rating / 5 : QUALITY_DEFAULT

  return (
    WEIGHTS.coverage * coverage +
    WEIGHTS.intensity * intensity +
    WEIGHTS.quality * quality
  )
}

export { softScore, memberLikes }
