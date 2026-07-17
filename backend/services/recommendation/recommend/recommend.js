// Step 7 — the top-level pure function. Wires Stages 1–2 and the fairness /
// food-quota passes (Steps 3–6) into one call: raw pins in, a ranked,
// budget-fitting, fairness-checked shortlist out. Per
// ../../../../.claude/docs/recommendation-engine.md ("Pseudocode (Node)").
// Pure: no DB, no Express — `pins` is passed in, never queried here.

import { hardFilter } from '../filters/filters.js'
import { softScore } from '../score/score.js'
import { enrichMissing } from '../enrich/enrich.js'
import { computeShortlistSize, assembleWithFoodQuota } from '../assemble/assemble.js'
import { ensureEveryMemberCovered, ensureEveryDietCovered } from '../fairness/fairness.js'
import { ENRICHMENT_POOL_SIZE, FOOD_MIN } from '../../../config/recommendation.js'
import { maxDistanceFrom } from '../../../utils/geo.js'

// Attach a fresh .score to each pin and sort best-first. Re-run whenever the
// underlying data changes (e.g. after enrichment) since scores can shift.
function scoreAndSort(pins, members, groupTags, groupFood) {
  return pins
    .map((pin) => ({ ...pin, score: softScore(pin, members, groupTags, groupFood) }))
    .sort((a, b) => b.score - a.score)
}

// trip    = { startTime, endTime, maxBudgetPerPerson, ... }
// members = [ { name, startLocation, interestTags[], foodPrefs[], diet[]? }, ... ]
// pins  = seeded pin data (see helpers.js for the normalized shape)
//
// Returns { shortlist, constraints } — constraints travel with the shortlist
// so the AI sequencing step (POST /ai-agent) has the raw numbers it needs
// without re-deriving them from members/trip itself.
function recommend(trip, members, pins) {
  const groupTags = new Set(members.flatMap((m) => m.interestTags ?? []))
  const groupFood = new Set(members.flatMap((m) => m.foodPrefs ?? []))

  // Stage 1: hard filters (relevance, diet, budget sanity, hours) + Stage 0's
  // meeting point / travel-radius drop. meetingPoint is null when members carry
  // no coordinates; memberCoords is reused for the fairness metric below.
  const { candidates, meetingPoint, memberCoords } = hardFilter(pins, members, trip)

  // Stage 2: soft score + rank the full survivor pool.
  const scoredCandidates = scoreAndSort(candidates, members, groupTags, groupFood)

  // Enrichment seam: enrichMissing() gets a shot at the top slice (lazy Google +
  // cache). It's a no-op today, so no re-score is needed — when it's implemented
  // and actually changes ratings/price/hours, re-score + re-sort the enriched
  // slice here before assembly.
  const rankedTop = enrichMissing(scoredCandidates.slice(0, ENRICHMENT_POOL_SIZE))

  // Assemble the food-quota'd shortlist from the top slice, floor-filling meals
  // from the full scored pool, then guarantee every member is represented.
  const shortlistSize = computeShortlistSize(trip)
  const assembled = assembleWithFoodQuota(rankedTop, scoredCandidates, shortlistSize)
  const covered = ensureEveryMemberCovered(assembled, members, scoredCandidates)
  // Then guarantee each dieted member has ≥1 restaurant they can actually eat at.
  const shortlist = ensureEveryDietCovered(covered, members, scoredCandidates)

  // Fairness metric: how far the worst-off member travels to the meeting point.
  // Only meaningful when members carry coordinates (meetingPoint !== null).
  const maxMemberDistance =
    meetingPoint && memberCoords.length > 0 ? maxDistanceFrom(meetingPoint, memberCoords) : null

  // Signal when the shortlist has fewer than FOOD_MIN meal options — e.g. a
  // tight travel radius or thin catalog leaves a "food desert" in range. The
  // AI / frontend can then tell the group meal choices are limited, rather than
  // the shortfall passing silently.
  const restaurantCount = shortlist.filter((p) => p.category === 'restaurant').length
  const foodBelowMin = restaurantCount < FOOD_MIN

  return {
    shortlist,
    constraints: {
      maxBudgetPerPerson: trip.maxBudgetPerPerson,
      groupSize: members.length,
      // Each member's start coordinate ({ latitude, longitude } from the
      // frontend's address picker), or undefined for a member without one.
      // The AI anchors on meetingPoint below, not these — they're carried for
      // the frontend's use (e.g. plotting members on the map).
      startingCoordinates: members.map((m) => m.startLocation),
      timeWindow: { startTime: trip.startTime, endTime: trip.endTime },
      transport: trip.transport ?? null,
      meetingPoint,
      travelRadius: trip.travelRadius ?? null,
      maxMemberDistance,
      foodBelowMin,
    },
  }
}

export { recommend }
