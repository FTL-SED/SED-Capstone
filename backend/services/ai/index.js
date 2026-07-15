// Step 6 — the top-level AI sequencing service. Orchestrates the pieces built
// in Steps 2–5 into one call: shortlist + constraints in, a validated itinerary
// out. Pure orchestration — no DB, no Express. The caller (Step 7 controller)
// passes data in and persists (Step 8) whatever comes back.
//
// Flow: build prompt → call OpenRouter → validate. On ANY failure (AI error,
// timeout, invalid output), log it and fall back to the deterministic
// sequencer, which produces the same schema so the caller can't tell which ran.
import { buildMessages } from './prompt.js'
import { callOpenRouter } from './client.js'
import { validateItinerary } from './validate.js'
import { fallbackSequence } from './fallback.js'
import { rescheduleStops } from './schedule.js'
import { optimizeRoute } from '../../utils/route.js'

// Reorder a feasible itinerary's stops for the shortest travel route (meals
// stay anchored), then re-walk the clock so times/travel legs match the new
// order. Runs on BOTH the AI and fallback output so every itinerary, whatever
// its source, gets the optimized route. Coords are re-hydrated from the
// shortlist by pinId (stops themselves only carry pinId).
function optimizeItinerary(itinerary, shortlist, constraints) {
  const coordById = new Map(
    shortlist.map((p) => [p.id, { latitude: p.latitude, longitude: p.longitude }])
  )
  const coordOf = (stop) => coordById.get(stop.pinId)

  const ordered = optimizeRoute(itinerary.stops, coordOf)
  const startTime = constraints?.timeWindow?.startTime ?? itinerary.stops[0].arriveTime
  const stops = rescheduleStops(ordered, coordOf, startTime)

  return { ...itinerary, stops }
}

async function tryAi(shortlist, constraints) {
  const messages = buildMessages(shortlist, constraints)
  const result = await callOpenRouter({ messages })

  const { valid, errors } = validateItinerary(result, shortlist, constraints)
  if (!valid) {
    // Surface WHY the AI output was rejected — this is the signal for tuning
    // the prompt / model choice later.
    const err = new Error(`AI itinerary failed validation: ${errors.join('; ')}`)
    err.validationErrors = errors
    throw err
  }
  return result
}

// Generate a one-day itinerary from the recommendation engine's output.
//   shortlist   = ranked pins (each with .id) — see services/recommendation
//   constraints = { timeWindow?, maxBudgetPerPerson, groupSize, startingLocations, ... }
// Returns one of:
//   { itinerary, source: 'ai' | 'fallback' } on success
//   { feasible: false, reason } when constraints are too tight for any day
// `source` lets the caller log/measure how often the AI path is actually used.
async function generateItinerary(shortlist, constraints) {
  let result
  let source = 'ai'

  try {
    result = await tryAi(shortlist, constraints)
  } catch (err) {
    console.error('AI sequencing failed, using deterministic fallback:', err.message)
    result = fallbackSequence(shortlist, constraints)
    source = 'fallback'

    // The fallback can itself declare the trip infeasible (empty shortlist,
    // impossible window). Validate it too so a bug there can't ship a broken
    // itinerary — if even the fallback is invalid, that's a real error.
    if (result.feasible !== false) {
      const { valid, errors } = validateItinerary(result, shortlist, constraints)
      if (!valid) {
        throw new Error(`Fallback itinerary failed validation: ${errors.join('; ')}`)
      }
    }
  }

  if (result.feasible === false) {
    return { feasible: false, reason: result.reason }
  }

  // Optimize the route (shortest travel, meals anchored) + re-walk the clock.
  // Re-validate: reordering/rescheduling must never break a rule (e.g. push a
  // stop outside the window). If it somehow does, keep the pre-optimization
  // result rather than ship an invalid one.
  const optimized = optimizeItinerary(result, shortlist, constraints)
  const { valid } = validateItinerary(optimized, shortlist, constraints)
  const itinerary = valid ? optimized : result

  return { itinerary, source }
}

export { generateItinerary }
