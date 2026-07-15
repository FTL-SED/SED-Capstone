// Step 5 — deterministic fallback sequencer. When the AI call fails or returns
// invalid output, this produces a valid itinerary from the same shortlist +
// constraints, in the SAME schema (config/ai.js ITINERARY_SCHEMA), so nothing
// downstream cares which path ran. No AI, no DB, no Express — pure.
//
// Strategy: anchor at the meetingPoint (or the first pin if none), order the
// rest by nearest-neighbor distance, drop meal restaurants into their windows,
// then walk the clock assigning arrive/depart times until the trip window (or
// the shortlist) runs out.
import {
  AVG_STOP_DURATION_MIN,
  MEAL_TIME_WINDOWS,
  FALLBACK_TRAVEL_MPH,
} from '../../config/ai.js'
import { haversineMiles, milesToMeters } from '../../utils/geo.js'

const isRestaurant = (pin) => pin.category === 'restaurant'

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const toHHMM = (mins) => {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Estimated travel minutes between two pins from straight-line distance.
function travelMinutes(a, b) {
  const miles = haversineMiles(a, b)
  return Math.round((miles / FALLBACK_TRAVEL_MPH) * 60)
}

// Order pins by nearest-neighbor starting from `anchor`: repeatedly take the
// closest not-yet-visited pin. Greedy, not optimal, but avoids the worst
// cross-city zig-zag and is fully deterministic.
function nearestNeighborOrder(pins, anchor) {
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
function mealBlockAt(mins) {
  for (const [name, block] of Object.entries(MEAL_TIME_WINDOWS)) {
    if (mins >= toMinutes(block.start) && mins <= toMinutes(block.end)) return name
  }
  return null
}

// Build the deterministic itinerary. Returns the same shape the AI would:
// { feasible: true, title, location, description, stops[] } or
// { feasible: false, reason } when nothing can fit.
function fallbackSequence(shortlist, constraints) {
  const { timeWindow, maxBudgetPerPerson, groupSize, meetingPoint } = constraints ?? {}

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

  const budgetCap =
    typeof maxBudgetPerPerson === 'number' && typeof groupSize === 'number'
      ? maxBudgetPerPerson * groupSize
      : Infinity

  const stops = []
  const mealsUsed = new Set() // meal blocks already filled — one meal per block
  let clock = startMins
  let spent = 0
  let prev = null

  for (const pin of ordered) {
    // Travel from the previous stop eats clock time before we can arrive.
    if (prev) clock += travelMinutes(prev, pin)

    const arrive = clock
    const depart = arrive + AVG_STOP_DURATION_MIN
    // Out of daylight — stop packing the day.
    if (depart > endMins) break

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
      estimatedCostPerPerson: cost,
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
    stops[i].travelTimeToNextMinutes = travelMinutes(stops[i].pin, stops[i + 1].pin)
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
