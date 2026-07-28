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
import { windowLengthMinutes } from '../../utils/time.js'
import { AI_VALIDATION_RETRIES } from '../../config/ai.js'

// Reorder a feasible itinerary's stops for the shortest travel route (meals
// stay anchored), then re-walk the clock so times/travel legs match the new
// order. Runs on BOTH the AI and fallback output so every itinerary, whatever
// its source, gets the optimized route. Coords are re-hydrated from the
// shortlist by pinId (stops themselves only carry pinId).
// `fill` requests the scheduler's window-fill (stretch non-meal dwells so a thin
// day reaches the window end). Passed for the fallback source only — the AI's
// day already fills the window, and a short AI day is rejected to the fallback
// upstream, so re-filling AI output would only distort its deliberate pacing.
const optimizeItinerary = (itinerary, shortlist, constraints, { fill = false } = {}) => {
  const coordById = new Map(
    shortlist.map((p) => [p.id, { latitude: p.latitude, longitude: p.longitude }])
  )
  const coordOf = (stop) => coordById.get(stop.pinId)

  const ordered = optimizeRoute(itinerary.stops, coordOf)
  const startTime = constraints?.timeWindow?.startTime ?? itinerary.stops[0].arriveTime

  // Window-fill needs the window length in elapsed minutes; only meaningful for
  // a same-day window with both ends known.
  const { startTime: ws, endTime: we } = constraints?.timeWindow ?? {}
  const scheduleOpts =
    fill && ws && we ? { windowEndElapsed: windowLengthMinutes(ws, we) } : {}
  const stops = rescheduleStops(ordered, coordOf, startTime, constraints?.transport, scheduleOpts)

  return { ...itinerary, stops }
}

// Errors the model can plausibly fix by re-drafting (vs. a hallucinated pin or
// broken shape, which won't improve on a re-ask). Cross-stop budget arithmetic
// and coverage/meal placement are exactly the "slipped, try again" kind.
const isRetryable = (errors) =>
  errors.some((e) => /budget|day ends too early|missing a meal|outside the trip window|idle|out of order|block/.test(e))

const tryAi = async (shortlist, constraints, callAiFn) => {
  const messages = buildMessages(shortlist, constraints)
  let result = await callAiFn(messages)
  let { valid, errors } = validateItinerary(result, shortlist, constraints)
  if (valid) return result

  // Corrective retries before giving up to the fallback. LLMs reliably get the
  // SHAPE right but slip on cross-stop arithmetic (esp. summing each stop's price
  // against the budget); handing the exact validation errors back lets the model
  // fix its own draft — much better in quality than dropping to the deterministic
  // fallback. The model tends to converge over a couple of rounds (e.g. $67 → $55
  // → in-budget), so we allow AI_VALIDATION_RETRIES rounds, re-asking with each
  // round's FRESH errors. A conversation transcript (assistant draft + user
  // correction) accumulates so the model sees its own prior attempts.
  const transcript = [...messages]
  for (let attempt = 0; attempt < AI_VALIDATION_RETRIES && isRetryable(errors); attempt++) {
    transcript.push(
      { role: 'assistant', content: JSON.stringify(result) },
      {
        role: 'user',
        content:
          `Your itinerary broke these rules:\n- ${errors.join('\n- ')}\n\n` +
          'Return the FULL corrected itinerary JSON (same format), fixing these ' +
          'problems:\n' +
          '• "mealType ... outside that block": either MOVE that restaurant earlier ' +
          'so it arrives inside its meal window, or REMOVE the mealType tag (keep it ' +
          'as a regular food stop). Do not keep a lunch tag on a stop after the lunch window closes.\n' +
          '• "day ends too early": ADD more shortlist places (or lengthen stops a ' +
          'little) so the LAST stop departs close to the window end.\n' +
          '• over budget: SUM every stop\'s pricePerPerson and swap expensive stops ' +
          'for cheaper shortlist options only until the total is within ' +
          'maxBudgetPerPerson — you do not need to go below it.',
      },
    )
    result = await callAiFn(transcript)
    ;({ valid, errors } = validateItinerary(result, shortlist, constraints))
    if (valid) return result
  }

  // Surface WHY the AI output was rejected — this is the signal for tuning the
  // prompt / model choice later, and the trigger for the deterministic fallback.
  const err = new Error(`AI itinerary failed validation: ${errors.join('; ')}`)
  err.validationErrors = errors
  throw err
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
    // Pass enforceCoverage:false so the coverage backstop doesn't reject the
    // fallback's own greedy-maximal day (C2 fix). Still enforces meals.
    if (result.feasible !== false) {
      const { valid, errors } = validateItinerary(result, shortlist, constraints, { enforceCoverage: false })
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
  // result rather than ship an invalid one. When source is fallback, pass
  // enforceCoverage:false so the backstop doesn't trip here either (C2 fix).
  // Fill on BOTH paths: stretch existing stops (each capped at baseline +
  // STOP_STRETCH_MAX_MIN, distributed) so a day that ends short of the window
  // reaches nearer the end. The AI's raw output already passed the coverage
  // check in tryAi, so fill only tightens the tail here — it never shortens a
  // day. Coverage is re-checked with enforceCoverage:false because it was
  // already enforced upstream (AI) or intentionally exempt (fallback); fill
  // can't overflow the window (its legality check forbids it).
  const optimized = optimizeItinerary(result, shortlist, constraints, { fill: true })
  const { valid } = validateItinerary(optimized, shortlist, constraints, { enforceCoverage: false })
  const itinerary = valid ? optimized : result

  return { itinerary, source }
}

export { generateItinerary }
