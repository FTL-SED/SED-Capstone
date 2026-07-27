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
  enforceableMealBlocks,
  travelMinutesFor,
  CATEGORY,
} from '../../../config/ai.js'
import { haversineMiles } from '../../../utils/geo.js'
import { toMinutes, toHHMM, windowLengthMinutes, MINUTES_PER_DAY } from '../../../utils/time.js'
import { backfillTravelLegs } from './travelLegs.js'

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

  // Which meal blocks to guarantee: only blocks where a full
  // AVG_STOP_DURATION_MIN stop can be seated. Uses the SAME predicate as
  // validation so they can't drift (C1 fix).
  const wantMeals = includeMeals !== false && !foodBelowMin
  const targetBlocks = wantMeals ? enforceableMealBlocks(startHHMM, endHHMM, AVG_STOP_DURATION_MIN) : []

  // Reserve one best-rated, distinct restaurant per target block. Each becomes
  // a fixed anchor at its block's open time (elapsed from start, clamped ≥0).
  const usedIds = new Set()
  const anchors = []
  for (const block of targetBlocks) {
    const pick = shortlist
      .filter((p) => isRestaurant(p) && !usedIds.has(p.id))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0]
    if (!pick) continue
    usedIds.add(pick.id)
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

  const emit = (pin, arrive, mealType) => {
    const depart = arrive + AVG_STOP_DURATION_MIN
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
      const depart = arrive + AVG_STOP_DURATION_MIN
      const cost = typeof pin.pricePerPerson === 'number' ? pin.pricePerPerson : 0
      const fitsWindow = depart <= windowLen
      const fitsBudget = spent + cost + reservedMealBudget() <= budgetCap
      // Yield to the meal once an activity would run into its open time.
      const beforeMeal = !nextMeal || depart <= nextMeal.arrive
      if (fitsWindow && fitsBudget && beforeMeal) {
        emit(pin, arrive)
        ai++
        continue
      }
      if (!fitsWindow && !nextMeal) break
      if (fitsWindow && !fitsBudget && !nextMeal) { ai++; continue }
    }

    if (nextMeal) {
      const arrive = Math.max(prev ? clock + travelMinutes(prev, nextMeal.pin, transport) : clock, nextMeal.arrive)
      // Only tag the mealType when it lands inside the block; otherwise place it
      // as an ordinary stop so validation's "mealType outside its block" rule
      // can't reject the day (rare in SF's short distances / wide blocks).
      const inBlock = arrive <= (toMinutes(MEAL_TIME_WINDOWS[nextMeal.block].end) - startWall)
      if (arrive + AVG_STOP_DURATION_MIN <= windowLen) {
        emit(nextMeal.pin, arrive, inBlock ? nextMeal.block : undefined)
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
  // then backfill travel legs on the final order.
  stops.sort((a, b) => toMinutes(a.arriveTime) - toMinutes(b.arriveTime))
  backfillTravelLegs(stops, (stop) => stop.pin, transport)

  const cleanStops = stops.map(({ pin, ...stop }) => stop)
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
