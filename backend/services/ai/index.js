// The main entry point: given a shortlist of places + the trip's constraints,
// produce one finished itinerary.
//
// Scheduler + narrator design (see .claude/roadmap/ai-scheduler-narrator-redesign.md):
//   1. buildPlan SELECTS the exact day deterministically — budget, meals, and
//      window coverage are already valid before any model call.
//   2. The LLM only RE-ORDERS the selected places and writes prose. It emits no
//      times, travel, or budget, so it cannot make the day infeasible.
//   3. The backend SCHEDULES the chosen order (optimizeRoute + rescheduleStops),
//      owning every time and distance.
// If the model fails (timeout, bad JSON, bad order) we schedule the deterministic
// default order instead — never a retry. No database or Express here.
import { buildMessages } from './generation/prompt.js'
import { callAI } from './generation/client.js'
import { validateItinerary } from './validation/validate.js'
import { buildPlan, dayStart } from './plan/plan.js'
import { resolveOrder, resolveNarration } from './narrate/narrate.js'
import { rescheduleStops } from './fallback/schedule.js'
import { sanitizeItineraryText } from './sanitizeText.js'
import { optimizeRoute } from '../../utils/route.js'
import { windowLengthMinutes } from '../../utils/time.js'
import { stopDurationFor } from '../../config/ai.js'

// Schedule a chosen visit ORDER into a fully-timed itinerary. This is the single
// place times and distances are computed — from the order alone, never from the
// model. optimizeRoute keeps meals anchored while minimizing travel between
// them; rescheduleStops walks the clock, backfills travel legs, and fills the
// window. Coords/meal roles come from the plan (by pinId), so the schedule is
// deterministic regardless of who produced the order.
const scheduleOrder = (order, plan, constraints, narration) => {
  const coordById = new Map(plan.selected.map((p) => [p.id, p]))
  const coordOf = (stop) => {
    const p = coordById.get(stop.pinId)
    return p ? { latitude: p.latitude, longitude: p.longitude } : undefined
  }

  // Build ordered stops carrying meal role, per-place note, and the per-type
  // dwell (durationMinutes) the scheduler uses; times are assigned by the
  // scheduler, not here.
  const stops = order.map((pinId) => ({
    pinId,
    durationMinutes: stopDurationFor(coordById.get(pinId)),
    ...(plan.mealById.has(pinId) ? { mealType: plan.mealById.get(pinId) } : {}),
    ...(narration.notes.has(pinId) ? { note: narration.notes.get(pinId) } : {}),
  }))

  const optimized = optimizeRoute(stops, coordOf)
  const startTime = dayStart(constraints)
  const { startTime: ws, endTime: we } = constraints?.timeWindow ?? {}
  const scheduleOpts = ws && we ? { windowEndElapsed: windowLengthMinutes(ws, we) } : {}
  const timed = rescheduleStops(optimized, coordOf, startTime, constraints?.transport, scheduleOpts)

  // durationMinutes was a scheduler input only — drop it from the emitted stop
  // shape (pinId/arriveTime/departTime/mealType/note + travel legs).
  const cleanStops = timed.map(({ durationMinutes, ...stop }) => stop)

  return {
    feasible: true,
    title: narration.title,
    location: narration.location,
    description: narration.description,
    stops: cleanStops,
  }
}

// Call the narrator model and return its parsed reply, or null on any failure
// (timeout, network, unparseable) — the caller falls back to the default order.
const narrate = async (places, constraints, callAiFn) => {
  try {
    return await callAiFn(buildMessages(places, constraints))
  } catch (err) {
    console.error('AI narration failed, using deterministic order:', err.message)
    return null
  }
}

// Generate a one-day itinerary from the recommendation engine's output.
//   shortlist   = ranked pins (each with .id) — see services/recommendation
//   constraints = { timeWindow?, maxBudgetPerPerson, groupSize, meetingPoint?, ... }
// Returns one of:
//   { itinerary, source: 'ai' | 'deterministic' } on success
//   { feasible: false, reason } when constraints are too tight for any day
// `source` is 'ai' when the model's order was used, 'deterministic' otherwise.
// `callAiFn` is injectable so tests can drive the narrator branch without a live
// model; it defaults to the real client.
const generateItinerary = async (shortlist, constraints, callAiFn = callAI) => {
  // 1. Deterministic selection — the day is already valid on budget/meals/window.
  const plan = buildPlan(shortlist, constraints)
  if (plan.feasible === false) return { feasible: false, reason: plan.reason }

  // Fallback prose the scheduler uses if the model doesn't supply its own.
  const firstPin = plan.selected[0]
  const fallbackLocation = deriveLocation(firstPin)
  const narrationDefaults = {
    fallbackTitle: `A Day Out in ${fallbackLocation}`,
    fallbackDescription: `A group day exploring ${plan.selected.length} spots around ${fallbackLocation}.`,
    fallbackLocation,
  }

  // 2. Ask the model to re-order + narrate (never blocks the day if it fails).
  const reply = await narrate(plan.places, constraints, callAiFn)
  const order = resolveOrder(reply, plan.defaultOrder)
  const narration = resolveNarration(reply, narrationDefaults)
  const usedAiOrder = reply != null && order !== plan.defaultOrder

  // 3. Schedule the chosen order deterministically (all time/distance math).
  let itinerary = scheduleOrder(order, plan, constraints, narration)
  let source = usedAiOrder ? 'ai' : 'deterministic'

  // 4. Validate. The day can only be invalid via the model's ORDER (times are
  //    ours), so on failure schedule the deterministic default order instead —
  //    never a retry. enforceCoverage:false because selection already sized the
  //    day; the scheduler's window-fill tightens the tail.
  const { valid } = validateItinerary(itinerary, plan.selected, constraints, { enforceCoverage: false })
  if (!valid && source === 'ai') {
    itinerary = scheduleOrder(plan.defaultOrder, plan, constraints, narration)
    source = 'deterministic'
  }

  // Deterministic style pass on the human-readable text (12h times, no em/en
  // dashes) — a net for any prose the model wrote; touches text only.
  return { itinerary: sanitizeItineraryText(itinerary), source }
}

// Short "Street, City" (or city) label for the itinerary location, from the
// first selected pin's address. Mirrors the old fallback's toShortLocation.
const deriveLocation = (pin) => {
  const address = pin?.address
  if (typeof address !== 'string' || !address.trim()) return 'San Francisco'
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return address
  const street = parts[0].replace(/^\d+\s+/, '').trim()
  return street ? `${street}, ${parts[1]}` : parts[1]
}

export { generateItinerary }
