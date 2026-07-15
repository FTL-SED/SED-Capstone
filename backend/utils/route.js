// Route optimization: reorder a day's stops so total travel distance is
// minimized (a Traveling Salesman variant). Meal stops are ANCHORS — they keep
// their position in the sequence so a dinner can't be optimized to 9am — and
// only the non-meal stops between them are reordered. Pure: stops + a coord
// lookup in, a reordered stops array out. No timing here (see the scheduler).
import { haversineMiles } from './geo.js'

// Brute-forcing permutations is factorial, so cap it. Itineraries that fit a
// single day are small (a 12h day at ~90min/stop is ~8 stops), so this is
// almost never hit — above it we keep the AI's order rather than approximate.
const MAX_BRUTE_FORCE = 8

const isMeal = (stop) => stop.mealType !== undefined

// Total straight-line miles along a sequence of stops, in order.
function routeMiles(sequence, coordOf) {
  let miles = 0
  for (let i = 0; i < sequence.length - 1; i++) {
    const a = coordOf(sequence[i])
    const b = coordOf(sequence[i + 1])
    if (a && b) miles += haversineMiles(a, b)
  }
  return miles
}

// All orderings of `items` (Heap's algorithm). Only called for ≤ MAX_BRUTE_FORCE.
function* permutations(items) {
  if (items.length <= 1) {
    yield items
    return
  }
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)]
    for (const perm of permutations(rest)) {
      yield [items[i], ...perm]
    }
  }
}

// Reorder `stops` to minimize total travel distance, keeping every meal stop at
// its original index. Non-meal stops are permuted among the remaining slots.
//   coordOf(stop) => { latitude, longitude } (looked up from the shortlist).
function optimizeRoute(stops, coordOf) {
  if (!Array.isArray(stops) || stops.length <= 2) return [...(stops ?? [])]

  const mealAt = new Map() // fixed index -> meal stop
  const nonMeal = []
  stops.forEach((stop, i) => {
    if (isMeal(stop)) mealAt.set(i, stop)
    else nonMeal.push(stop)
  })

  // Nothing (or nearly nothing) to reorder.
  if (nonMeal.length <= 1) return [...stops]
  // Too many to brute-force exactly — keep the given order rather than guess.
  if (nonMeal.length > MAX_BRUTE_FORCE) return [...stops]

  const freeSlots = stops.map((_, i) => i).filter((i) => !mealAt.has(i))

  let best = null
  let bestMiles = Infinity
  for (const perm of permutations(nonMeal)) {
    const seq = new Array(stops.length)
    for (const [i, stop] of mealAt) seq[i] = stop
    freeSlots.forEach((slot, k) => {
      seq[slot] = perm[k]
    })
    const miles = routeMiles(seq, coordOf)
    if (miles < bestMiles) {
      bestMiles = miles
      best = seq
    }
  }

  return best
}

export { optimizeRoute, routeMiles }
