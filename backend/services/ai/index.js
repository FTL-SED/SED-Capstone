// The main entry point that ties everything together: given a shortlist of
// places + the trip's constraints, produce one finished itinerary.
//
// Plan: ask the AI to sequence the day; if that fails for any reason (network
// error, timeout, or output we can't trust), fall back to our own code that
// builds an itinerary in the exact same shape. Either way we then optimize the
// route and return the result. No database or Express here — just the logic.
import { buildMessages } from './generation/prompt.js'
import { callAI } from './generation/client.js'
import { validateItinerary } from './validation/validate.js'
import { fallbackSequence } from './fallback/fallback.js'
import { rescheduleStops } from './fallback/schedule.js'
import { optimizeRoute } from '../../utils/route.js'

// Reorder a feasible itinerary's stops for the shortest travel route (meals
// stay anchored), then re-walk the clock so times/travel legs match the new
// order. Runs on BOTH the AI and fallback output so every itinerary, whatever
// its source, gets the optimized route. Coords are re-hydrated from the
// shortlist by pinId (stops themselves only carry pinId).
const optimizeItinerary = (itinerary, shortlist, constraints) => {
  const coordById = new Map(
    shortlist.map((p) => [p.id, { latitude: p.latitude, longitude: p.longitude }])
  )
  const coordOf = (stop) => coordById.get(stop.pinId)

  const ordered = optimizeRoute(itinerary.stops, coordOf)
  const startTime = constraints?.timeWindow?.startTime ?? itinerary.stops[0].arriveTime
  const stops = rescheduleStops(ordered, coordOf, startTime, constraints?.transport)

  return { ...itinerary, stops }
}

const tryAi = async (shortlist, constraints, callAiFn) => {
  const messages = buildMessages(shortlist, constraints)
  const result = await callAiFn(messages)

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
//   constraints = { timeWindow?, maxBudgetPerPerson, groupSize, meetingPoint?, ... }
// Returns one of:
//   { itinerary, source: 'ai' | 'fallback' } on success
//   { feasible: false, reason } when constraints are too tight for any day
// `source` lets the caller log/measure how often the AI path is actually used.
// `callAiFn` is injectable so tests can drive the AI branch (good/malformed/
// hallucinated output) without a live model; it defaults to the real client.
const generateItinerary = async (shortlist, constraints, callAiFn = callAI) => {
  let result
  let source = 'ai'

  try {
    result = await tryAi(shortlist, constraints, callAiFn)
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
