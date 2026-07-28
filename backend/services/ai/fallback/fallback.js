// Our own itinerary builder, used when the AI call fails or returns something
// we can't trust. It produces an itinerary in the SAME shape the AI would, so
// the rest of the app doesn't care which one ran. No AI involved — just code,
// which means it always gives the same output for the same input.
//
// The plan: start at the meeting point (or the first place if there's none),
// visit the closest remaining place each time (nearest-neighbor ordering), slot
// restaurants into meal times, and walk the clock forward until we run out of
// day or places.
import {
  AVG_STOP_DURATION_MIN,
  MEAL_TIME_WINDOWS,
  requiredMealBlocks,
  stopDurationFor,
  travelMinutesFor,
  CATEGORY,
} from '../../../config/ai.js'
import { haversineMiles } from '../../../utils/geo.js'
import { toMinutes, toHHMM, windowLengthMinutes, MINUTES_PER_DAY } from '../../../utils/time.js'
import { rescheduleStops } from './schedule.js'

const isRestaurant = (pin) => pin.category === CATEGORY.restaurant

// Estimated travel minutes between two pins, scaled to the group's transport
// mode (walking/biking/transit/driving). Undefined ⇒ the default urban speed.
const travelMinutes = (a, b, transport) =>
  travelMinutesFor(haversineMiles(a, b), transport)

// Order pins by nearest-neighbor starting from `anchor`: repeatedly take the
// closest not-yet-visited pin. Greedy, not optimal, but avoids the worst
// cross-city zig-zag and is fully deterministic.
const nearestNeighborOrder = (pins, anchor) => {
  const remaining = [...pins]
  const ordered = []
  let current = anchor

  while (remaining.length > 0) {
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMiles(current, remaining[i])
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    const [next] = remaining.splice(bestIdx, 1)
    ordered.push(next)
    current = next
  }

  return ordered
}

// Build the deterministic itinerary. Returns the same shape the AI would:
// { feasible: true, title, location, description, stops[] } or
// { feasible: false, reason } when nothing can fit.
const fallbackSequence = (shortlist, constraints) => {
  const {
    timeWindow, maxBudgetPerPerson, meetingPoint, transport,
    includeMeals, foodBelowMin,
  } = constraints ?? {}

  if (!Array.isArray(shortlist) || shortlist.length === 0) {
    return { feasible: false, reason: 'No places available to sequence.' }
  }

  const startWall = toMinutes(timeWindow?.startTime ?? '09:00')
  const startHHMM = timeWindow?.startTime ?? '09:00'
  const endHHMM = timeWindow?.endTime ?? '21:00'
  const windowLen = windowLengthMinutes(startHHMM, endHHMM)
  if (windowLen <= 0) {
    return { feasible: false, reason: 'Trip time window is empty or inverted.' }
  }
  const wallAt = (elapsed) => (startWall + elapsed) % MINUTES_PER_DAY
  const budgetCap = typeof maxBudgetPerPerson === 'number' ? maxBudgetPerPerson : Infinity

  // Which meal blocks to guarantee: the REQUIRED blocks (lunch/dinner) where a
  // full AVG_STOP_DURATION_MIN stop can be seated. Uses the SAME predicate as
  // validation (requiredMealBlocks) so they can't drift (C1 fix) — and so the
  // fallback no longer reserves a breakfast the group didn't ask for.
  const wantMeals = includeMeals !== false && !foodBelowMin
  const targetBlocks = wantMeals ? requiredMealBlocks(startHHMM, endHHMM, AVG_STOP_DURATION_MIN) : []

  // Reserve one restaurant per target block, picking the best-rated option that
  // keeps the cumulative meal budget within budgetCap. Each becomes a fixed
  // anchor at its block's open time (elapsed from start, clamped ≥0).
  // Budget-aware selection: prefer highest-rated, but a pick must leave enough
  // budget for the CHEAPEST possible pick of every remaining required block —
  // otherwise a pricey early meal starves a later required one (e.g. a $25 lunch
  // on a $25 budget leaves $0 for a required dinner, which validation then
  // demands → the fallback would fail validation and generateItinerary throws).
  const costOf = (p) => (typeof p.pricePerPerson === 'number' ? p.pricePerPerson : 0)
  const usedIds = new Set()
  const anchors = []
  let mealBudgetSpent = 0
  for (let b = 0; b < targetBlocks.length; b++) {
    const block = targetBlocks[b]
    const candidates = shortlist
      .filter((p) => isRestaurant(p) && !usedIds.has(p.id))
      .sort((a, b2) => (b2.rating ?? 0) - (a.rating ?? 0))

    // Minimum cost to still fill each LATER required block: the cheapest distinct
    // restaurant available per remaining block (approximated by the N cheapest
    // unused restaurants, N = blocks left after this one). Reserving this stops a
    // pricey pick here from making a later required meal unaffordable.
    const remainingBlocks = targetBlocks.length - b - 1

    // Pick the best-rated restaurant that fits budget AND leaves the cheapest
    // remaining required meals affordable.
    let pick = null
    for (const candidate of candidates) {
      const cost = costOf(candidate)
      // Reserve = sum of the `remainingBlocks` cheapest OTHER unused restaurants,
      // i.e. the minimum it costs to still seat every later required block.
      const pool = shortlist
        .filter((p) => isRestaurant(p) && !usedIds.has(p.id) && p.id !== candidate.id)
        .map(costOf)
        .sort((x, y) => x - y)
      const reserve = pool.slice(0, remainingBlocks).reduce((s, c) => s + c, 0)
      const enoughForRemaining = pool.length >= remainingBlocks
      if (mealBudgetSpent + cost + reserve <= budgetCap && enoughForRemaining) {
        pick = candidate
        break
      }
    }
    if (!pick) continue
    usedIds.add(pick.id)
    mealBudgetSpent += costOf(pick)
    const openElapsed = Math.max(0, toMinutes(MEAL_TIME_WINDOWS[block].start) - startWall)
    if (openElapsed + AVG_STOP_DURATION_MIN <= windowLen) {
      anchors.push({ block, pin: pick, arrive: openElapsed })
    }
  }
  anchors.sort((a, b) => a.arrive - b.arrive)

  // Activities (and any unreserved restaurants) in nearest-neighbor order.
  const rest = shortlist.filter((p) => !usedIds.has(p.id))
  const anchorPoint = meetingPoint ?? shortlist[0]
  const ordered = nearestNeighborOrder(rest, anchorPoint)

  const stops = []
  let clock = 0
  let spent = 0
  let prev = null
  let ai = 0
  let mi = 0

  // Budget still needed by not-yet-placed meal anchors, so activities can't
  // spend money the guaranteed meals require.
  const reservedMealBudget = () =>
    anchors.slice(mi).reduce((sum, a) => sum + (a.pin.pricePerPerson ?? 0), 0)

  const emit = (pin, arrive, mealType, durationMin) => {
    const depart = arrive + durationMin
    stops.push({
      pin,
      pinId: pin.id,
      arriveTime: toHHMM(wallAt(arrive)),
      departTime: toHHMM(wallAt(depart)),
      ...(mealType ? { mealType } : {}),
    })
    spent += typeof pin.pricePerPerson === 'number' ? pin.pricePerPerson : 0
    clock = depart
    prev = pin
  }

  // Interleave: place activities until the next meal anchor is due, then the
  // meal (held to its open time), until the day is full or nothing fits.
  while (true) {
    const nextMeal = mi < anchors.length ? anchors[mi] : null

    if (ai < ordered.length) {
      const pin = ordered[ai]
      const arrive = prev ? clock + travelMinutes(prev, pin, transport) : clock
      // Per-type dwell (café 45, museum 120, …) instead of a flat 90, so the
      // fallback's day looks as realistic as the AI's.
      const duration = stopDurationFor(pin)
      const depart = arrive + duration
      const cost = typeof pin.pricePerPerson === 'number' ? pin.pricePerPerson : 0
      const fitsWindow = depart <= windowLen
      const fitsBudget = spent + cost + reservedMealBudget() <= budgetCap
      // Yield to the meal once an activity would run into its open time.
      const beforeMeal = !nextMeal || depart <= nextMeal.arrive
      if (fitsWindow && fitsBudget && beforeMeal) {
        emit(pin, arrive, undefined, duration)
        ai++
        continue
      }
      // Skip an activity we can never afford, whether or not a meal is pending —
      // retrying the same over-budget pin just stalls the queue and starves the
      // cheaper (often free) activities behind it in nearest-neighbor order.
      // (fitsBudget already reserves pending meals' cost, so this never skips an
      // activity merely to protect a meal it could afford alongside it.)
      if (fitsWindow && !fitsBudget) { ai++; continue }
      if (!fitsWindow && !nextMeal) break
    }

    if (nextMeal) {
      const arrive = Math.max(prev ? clock + travelMinutes(prev, nextMeal.pin, transport) : clock, nextMeal.arrive)
      // Only tag the mealType when it lands inside the block; otherwise place it
      // as an ordinary stop so validation's "mealType outside its block" rule
      // can't reject the day (rare in SF's short distances / wide blocks).
      const inBlock = arrive <= (toMinutes(MEAL_TIME_WINDOWS[nextMeal.block].end) - startWall)
      // Meals stay at AVG_STOP_DURATION_MIN: the block-fit math here and the
      // validator's requiredMealBlocks both reserve exactly this, so a longer
      // meal could overflow a meal-required window and fail re-validation.
      if (arrive + AVG_STOP_DURATION_MIN <= windowLen) {
        emit(nextMeal.pin, arrive, inBlock ? nextMeal.block : undefined, AVG_STOP_DURATION_MIN)
      }
      mi++
      continue
    }

    break
  }

  if (stops.length === 0) {
    return { feasible: false, reason: 'No places fit the trip time window and budget.' }
  }

  // Re-sort by arrival so a held meal never sits out of chronological order,
  // then re-walk the clock through the shared scheduler to normalize times and
  // backfill travel legs. Window-FILL is intentionally NOT applied here: the
  // caller (services/ai/index.js optimizeItinerary) runs the single fill pass on
  // BOTH the AI and fallback output. Filling here too would double-stretch — the
  // fill's per-stop cap is baseline+STOP_STRETCH_MAX_MIN, and a second pass would
  // treat the already-stretched dwell as the new baseline and stretch again.
  // Coords come from each stop's attached pin.
  stops.sort((a, b) => toMinutes(a.arriveTime) - toMinutes(b.arriveTime))
  const scheduled = rescheduleStops(stops, (stop) => stop.pin, startHHMM, transport)

  const cleanStops = scheduled.map(({ pin, ...stop }) => stop)
  const location = shortlist[0].address ?? 'your destination'
  return {
    feasible: true,
    title: `A Day Out in ${location}`,
    location,
    description: `A group day exploring ${stops.length} spots around ${location}.`,
    stops: cleanStops,
  }
}

export { fallbackSequence, nearestNeighborOrder, travelMinutes }
