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
  travelMinutesFor,
  CATEGORY,
} from '../../../config/ai.js'
import { haversineMiles, milesToMeters } from '../../../utils/geo.js'
import { toMinutes, toHHMM } from '../../../utils/time.js'

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

// Which meal block (if any) a given minute-of-day falls in.
const mealBlockAt = (mins) => {
  for (const [name, block] of Object.entries(MEAL_TIME_WINDOWS)) {
    if (mins >= toMinutes(block.start) && mins <= toMinutes(block.end)) return name
  }
  return null
}

// Build the deterministic itinerary. Returns the same shape the AI would:
// { feasible: true, title, location, description, stops[] } or
// { feasible: false, reason } when nothing can fit.
const fallbackSequence = (shortlist, constraints) => {
  const { timeWindow, maxBudgetPerPerson, meetingPoint, transport } = constraints ?? {}

  if (!Array.isArray(shortlist) || shortlist.length === 0) {
    return { feasible: false, reason: 'No places available to sequence.' }
  }

  // Anchor: the meetingPoint if given, else the first pin (so ordering still
  // works before the engine supplies a meetingPoint).
  const anchor = meetingPoint ?? shortlist[0]
  const ordered = nearestNeighborOrder(shortlist, anchor)

  // Time window (default to a generous 09:00–21:00 if none supplied yet).
  const startMins = toMinutes(timeWindow?.startTime ?? '09:00')
  const endMins = toMinutes(timeWindow?.endTime ?? '21:00')
  if (endMins <= startMins) {
    return { feasible: false, reason: 'Trip time window is empty or inverted.' }
  }

  // Stop costs are per person, so the cap is the per-person budget directly
  // (no groupSize multiplier — that would mix per-person costs with a
  // whole-group cap). Matches validate.js's budget rule.
  const budgetCap = typeof maxBudgetPerPerson === 'number' ? maxBudgetPerPerson : Infinity

  const stops = []
  const mealsUsed = new Set() // meal blocks already filled — one meal per block
  let clock = startMins
  let spent = 0
  let prev = null

  for (const pin of ordered) {
    // Travel from the previous stop eats clock time before we can arrive.
    // Compute the candidate arrival locally — do NOT mutate `clock`/`prev`
    // until we actually keep this stop, or a pin skipped for budget below
    // would leave the clock inflated by travel to a place we never visited.
    const arrive = prev ? clock + travelMinutes(prev, pin, transport) : clock
    const depart = arrive + AVG_STOP_DURATION_MIN
    // Out of daylight — stop packing the day.
    if (depart > endMins) break

    // Cost is a fact about the place (pin.pricePerPerson), used here only to
    // stay within budget — it's NOT written onto the stop. Downstream reads the
    // price from the shortlist by pinId (see validate.js / persist.js).
    const cost = typeof pin.pricePerPerson === 'number' ? pin.pricePerPerson : 0
    if (spent + cost > budgetCap) continue // skip this one, try the next

    // A restaurant landing in an open meal block becomes that meal; a second
    // restaurant in the same block is kept as an ordinary stop (block full).
    const block = isRestaurant(pin) ? mealBlockAt(arrive) : null
    const mealType = block && !mealsUsed.has(block) ? block : undefined
    if (mealType) mealsUsed.add(mealType)

    stops.push({
      pin,
      pinId: pin.id,
      arriveTime: toHHMM(arrive),
      departTime: toHHMM(depart),
      ...(mealType ? { mealType } : {}),
    })

    spent += cost
    clock = depart
    prev = pin
  }

  if (stops.length === 0) {
    return { feasible: false, reason: 'No places fit the trip time window and budget.' }
  }

  // Backfill travel legs now that the visit order is fixed: each stop stores
  // travel to the NEXT stop (last stop has none).
  for (let i = 0; i < stops.length - 1; i++) {
    const miles = haversineMiles(stops[i].pin, stops[i + 1].pin)
    stops[i].travelTimeToNextMinutes = travelMinutes(stops[i].pin, stops[i + 1].pin, transport)
    stops[i].distanceToNextMeters = Math.round(milesToMeters(miles))
  }

  // Strip the internal `pin` reference — the returned stops match the schema
  // (pinId only; name/coords are re-hydrated downstream from the shortlist).
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
