// Step 7 — the top-level pure function. Wires Stages 1–2 and the fairness /
// food-quota passes (Steps 3–6) into one call: raw pins in, a ranked,
// budget-fitting, fairness-checked shortlist out. Per
// ../../../../.claude/docs/recommendation-engine.md ("Pseudocode (Node)").
// Pure: no DB, no Express — `pins` is passed in, never queried here.

import { hardFilter } from '../filters/filters.js'
import { softScore } from '../score/score.js'
import { enrichMissing } from '../enrich/enrich.js'
import { computeShortlistSize, assembleWithFoodQuota, perStopBudget } from '../assemble/assemble.js'
import { ensureEveryMemberCovered, ensureEveryDietCovered, ensureEveryFoodPrefCovered } from '../fairness/fairness.js'
import { isRestaurant } from '../helpers/helpers.js'
import { ENRICHMENT_POOL_SIZE, FOOD_MIN } from '../../../config/recommendation.js'
import { maxDistanceFrom } from '../../../utils/geo.js'

// Attach a fresh .score to each pin and sort best-first. Re-run whenever the
// underlying data changes (e.g. after enrichment) since scores can shift.
// Assigns in place: `pins` here is always hardFilter's own fresh copies
// (never the caller's input), so there's no need to spread every survivor a
// second time just to attach the score.
function scoreAndSort(pins, members, groupTags, groupFood, perStopTarget) {
  for (const pin of pins) pin.score = softScore(pin, members, groupTags, groupFood, perStopTarget)
  return pins.sort((a, b) => b.score - a.score)
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
  const groupDiet = new Set(members.flatMap((m) => m.diet ?? []))

  // Stage 1: hard filters (relevance, diet, budget sanity, hours) + Stage 0's
  // meeting point / travel-radius drop. Pass the already-computed groupTags so
  // hardFilter doesn't rebuild the identical Set. meetingPoint is null when
  // members carry no coordinates; memberCoords is reused for the fairness metric.
  const { candidates, meetingPoint, memberCoords } = hardFilter(pins, members, trip, groupTags)

  // Meal opt-out: when the group unchecks meals, restaurants are dropped from
  // the pool entirely so the shortlist isn't stuffed with food the AI would then
  // schedule — the food quota, diet coverage, and food-pref coverage are ALL
  // meal logic and are skipped below. Activities-only day.
  const wantMeals = trip.includeMeals !== false
  const pool = wantMeals ? candidates : candidates.filter((p) => !isRestaurant(p))

  // Stage 2: soft score + rank the survivor pool. The value term aims each pin
  // at the fair PER-STOP budget (budget spread across the day's stops), so the
  // day favors ~budget/N-priced places instead of one that eats the whole budget.
  const perStopTarget = perStopBudget(trip)
  const scoredCandidates = scoreAndSort(pool, members, groupTags, groupFood, perStopTarget)

  // Enrichment seam: enrichMissing() gets a shot at the top slice (lazy Google +
  // cache). It's a no-op today, so no re-score is needed — when it's implemented
  // and actually changes ratings/price/hours, re-score + re-sort the enriched
  // slice here before assembly.
  const rankedTop = enrichMissing(scoredCandidates.slice(0, ENRICHMENT_POOL_SIZE))

  // Assemble the shortlist. With meals on, apply the food quota (floor-fill to
  // FOOD_MIN restaurants) + the two food-coverage passes. With meals off, the
  // pool has no restaurants, so just take the top `shortlistSize` scored pins and
  // skip all meal logic — only the interest-fairness pass runs.
  const shortlistSize = computeShortlistSize(trip)
  let shortlist
  if (wantMeals) {
    const assembled = assembleWithFoodQuota(rankedTop, scoredCandidates, shortlistSize)
    const covered = ensureEveryMemberCovered(assembled, members, scoredCandidates)
    // Guarantee each dieted member has ≥1 restaurant they can actually eat at.
    const dietCovered = ensureEveryDietCovered(covered, members, scoredCandidates)
    // Guarantee each member with food prefs gets ≥1 cuisine match they can eat
    // at — memberLikes-based coverage counts an interest match as "covered", so a
    // member's requested cuisine otherwise falls through (see fairness.js).
    shortlist = ensureEveryFoodPrefCovered(dietCovered, members, scoredCandidates)
  } else {
    const assembled = rankedTop.slice(0, shortlistSize)
    shortlist = ensureEveryMemberCovered(assembled, members, scoredCandidates)
  }

  // Fairness metric: how far the worst-off member travels to the meeting point.
  // Only meaningful when members carry coordinates (meetingPoint !== null).
  const maxMemberDistance =
    meetingPoint && memberCoords.length > 0 ? maxDistanceFrom(meetingPoint, memberCoords) : null

  // Signal when the shortlist has fewer than FOOD_MIN meal options — e.g. a
  // tight travel radius or thin catalog leaves a "food desert" in range. The
  // AI / frontend can then tell the group meal choices are limited, rather than
  // the shortfall passing silently. Meaningless when meals are opted out (no
  // restaurants by design), so it's false there — not a "food desert".
  const restaurantCount = shortlist.filter(isRestaurant).length
  const foodBelowMin = wantMeals && restaurantCount < FOOD_MIN

  return {
    shortlist,
    constraints: {
      maxBudgetPerPerson: trip.maxBudgetPerPerson,
      // The fair per-person spend for ONE stop (budget ÷ estimated stops),
      // rounded. Carried so the AI can size each stop's cost to it and keep the
      // day's total under budget — instead of picking pricey pins and summing
      // past the cap. Null when budget isn't set. See perStopBudget / prompt.js.
      perStopBudget: perStopTarget != null ? Math.round(perStopTarget) : null,
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
      // The group's aggregated preference tags, carried so a saved itinerary can
      // record and later edit what it was generated for (US #4/#7/#10).
      interests: [...groupTags],
      foodPreferences: [...groupFood],
      diets: [...groupDiet],
      maxMemberDistance,
      foodBelowMin,
      // Whether the group wants meals scheduled. Default true; the AI/fallback
      // and validator gate meal enforcement on this (opt-out ⇒ no meal rules).
      includeMeals: trip.includeMeals !== false,
    },
  }
}

export { recommend }
