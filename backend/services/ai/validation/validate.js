// Checks whether an itinerary (from the AI or the fallback) is one we can
// trust: right structure, and it obeys the trip's rules (times in order, inside
// the day, within budget, one meal per meal time, no made-up places). If
// anything is wrong, generateItinerary uses the fallback instead.
//
// Returns { valid, errors } — errors is a list of plain-English problems, handy
// for debugging. Note: a well-formed { feasible: false, reason } is a valid
// answer (the AI correctly saying "no itinerary fits"), not a failure.
import { MEAL_TIME_WINDOWS, CATEGORY, isInMealBlock, enforceableMealBlocks, AVG_STOP_DURATION_MIN } from '../../../config/ai.js'
import { toMinutes, minutesFromStart, windowLengthMinutes } from '../../../utils/time.js'

const HHMM_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

const isHHMM = (v) => typeof v === 'string' && HHMM_RE.test(v)

// Stop ORDERING and the trip-window bound are measured in elapsed minutes from
// the trip's start (see utils/time.minutesFromStart), so an overnight trip
// (22:00→02:00) sorts a 00:30 stop AFTER the evening instead of treating it as
// earliest. For a same-day trip this is identical to minutes-since-midnight.
//
// MEAL blocks, by contrast, are absolute daytime windows (breakfast 07:00–10:45
// etc., none cross midnight), so they're matched in plain wall-clock minutes —
// anchoring them to the trip start would wrap a block that straddles the start.

// Per-stop shape check (mirrors STOP_SCHEMA in config/ai.js). Pushes a labelled
// error for each malformed field so the log points at the exact stop.
const checkStopShape = (stop, i, errors) => {
  const at = `stops[${i}]`
  if (!stop || typeof stop !== 'object') {
    errors.push(`${at} is not an object`)
    return false
  }
  if (!Number.isInteger(stop.pinId)) errors.push(`${at}.pinId must be an integer`)
  if (!isHHMM(stop.arriveTime)) errors.push(`${at}.arriveTime must be "HH:MM"`)
  if (!isHHMM(stop.departTime)) errors.push(`${at}.departTime must be "HH:MM"`)
  if (stop.mealType !== undefined && !(stop.mealType in MEAL_TIME_WINDOWS)) {
    errors.push(`${at}.mealType "${stop.mealType}" is not a known meal`)
  }
  return errors.length === 0
}

// Business rules across the whole itinerary. Assumes stops already passed the
// shape check (times are valid HH:MM, pinId is an integer, etc.).
// `options.enforceCoverage` defaults true; when false, skips ONLY the coverage
// backstop (still enforces all other rules including meals) — used for fallback
// re-validation so the backstop's "day ends early" rule doesn't reject the
// fallback's own greedy-maximal output (C2 fix).
const checkBusinessRules = (stops, shortlist, constraints, errors, options = {}) => {
  const { enforceCoverage = true } = options
  const { timeWindow, maxBudgetPerPerson, includeMeals, foodBelowMin } = constraints ?? {}
  const byId = new Map(shortlist.map((p) => [p.id, p]))

  // Anchor for all time math: the trip start (elapsed minutes from here). When
  // no window is given, anchor on the first stop's arrival so ordering across
  // midnight still sorts correctly.
  const anchor = timeWindow?.startTime ?? stops[0]?.arriveTime ?? '00:00'
  const fromStart = (t) => minutesFromStart(anchor, t)

  // No hallucinated places — every pinId must come from the shortlist.
  for (const [i, stop] of stops.entries()) {
    if (!byId.has(stop.pinId)) {
      errors.push(`stops[${i}].pinId ${stop.pinId} is not in the shortlist (hallucinated place)`)
    }
  }

  // Per-stop: depart must not precede arrive (in elapsed-from-start space, so a
  // stop that arrives 23:30 and departs 00:30 is a 60-min dwell, not negative).
  for (const [i, stop] of stops.entries()) {
    if (fromStart(stop.departTime) < fromStart(stop.arriveTime)) {
      errors.push(`stops[${i}] departs before it arrives`)
    }
  }

  // Chronological: each stop must arrive no earlier than the previous departed.
  for (let i = 1; i < stops.length; i++) {
    if (fromStart(stops[i].arriveTime) < fromStart(stops[i - 1].departTime)) {
      errors.push(`stops[${i}] arrives before stops[${i - 1}] departs (out of order)`)
    }
  }

  // Every stop inside the trip time window. Measured as elapsed-from-start so an
  // overnight window (22:00→02:00) admits a 00:30 stop instead of rejecting it.
  if (timeWindow?.startTime && timeWindow?.endTime) {
    const windowEnd = windowLengthMinutes(timeWindow.startTime, timeWindow.endTime)
    for (const [i, stop] of stops.entries()) {
      const a = fromStart(stop.arriveTime)
      const d = fromStart(stop.departTime)
      if (a > windowEnd || d > windowEnd) {
        errors.push(`stops[${i}] falls outside the trip window ${timeWindow.startTime}-${timeWindow.endTime}`)
      }
    }
  }

  // Budget: the day's total PER-PERSON cost must fit the per-person budget.
  // Cost is a fact about each place, so sum the shortlist pins' pricePerPerson
  // by pinId — the stop never carries a cost. Per-person total vs per-person
  // cap, no groupSize multiplier (that would mix per-person costs with a
  // whole-group cap). An unknown/absent price counts as 0 here.
  if (typeof maxBudgetPerPerson === 'number') {
    const total = stops.reduce((sum, s) => sum + (byId.get(s.pinId)?.pricePerPerson ?? 0), 0)
    if (total > maxBudgetPerPerson) {
      errors.push(`total per-person cost ${total} exceeds budget ${maxBudgetPerPerson}`)
    }
  }

  // At most one MEAL per block. A stop counts as a meal only if it's a
  // restaurant (looked up by pinId) or explicitly declares a mealType — a park
  // that merely happens to start at 1pm is not a second lunch. A declared
  // mealType is attributed to that block; otherwise a restaurant is attributed
  // to whichever block its arriveTime falls in.
  const isMeal = (s) => s.mealType !== undefined || byId.get(s.pinId)?.category === CATEGORY.restaurant
  for (const [name, block] of Object.entries(MEAL_TIME_WINDOWS)) {
    const inBlock = stops.filter(
      (s) => isMeal(s) && (s.mealType === name || (s.mealType === undefined && isInMealBlock(toMinutes(s.arriveTime), block)))
    )
    if (inBlock.length > 1) {
      errors.push(`${inBlock.length} stops fall in the ${name} block (max 1)`)
    }
  }

  // Meal REQUIREMENT (lower bound): when the group wants meals and food isn't
  // scarce, every ENFORCEABLE meal block must have a meal stop. A block is
  // enforceable when a full AVG_STOP_DURATION_MIN stop can be seated inside
  // BOTH the trip window AND the block's hours — so validation + fallback agree
  // on which blocks to require/reserve (C1 fix).
  // Budget-feasibility gate: only require meals when the budget can afford one
  // DISTINCT restaurant per enforceable block. Take the N cheapest distinct
  // restaurants (where N = number of blocks); if their sum exceeds budget, meals
  // are infeasible → don't require them. This aligns with fallback's budget-aware
  // reservation — neither requires nor reserves meals the budget cannot afford
  // (budget-500 fix).
  const wantMeals = includeMeals !== false && !foodBelowMin
  const hasRestaurant = shortlist.some((p) => p.category === CATEGORY.restaurant)
  if (wantMeals && hasRestaurant && timeWindow?.startTime && timeWindow?.endTime) {
    const enf = enforceableMealBlocks(timeWindow.startTime, timeWindow.endTime, AVG_STOP_DURATION_MIN)
    // Compute the minimum meal-set cost: sum of the N cheapest distinct restaurants,
    // where N = number of enforceable blocks. If that sum exceeds budget, meals
    // are budget-infeasible → don't require them (budget wins, like foodBelowMin).
    const restaurants = shortlist
      .filter((p) => p.category === CATEGORY.restaurant)
      .map((p) => (typeof p.pricePerPerson === 'number' ? p.pricePerPerson : 0))
      .sort((a, b) => a - b)
    const minMealSetCost = restaurants.slice(0, enf.length).reduce((sum, cost) => sum + cost, 0)
    const budgetFeasible =
      typeof maxBudgetPerPerson !== 'number' ||
      (restaurants.length >= enf.length && minMealSetCost <= maxBudgetPerPerson)
    if (budgetFeasible) {
      for (const name of enf) {
        const block = MEAL_TIME_WINDOWS[name]
        const filled = stops.some(
          (s) => isMeal(s) && (s.mealType === name || (s.mealType === undefined && isInMealBlock(toMinutes(s.arriveTime), block)))
        )
        if (!filled) errors.push(`missing a meal in the ${name} block`)
      }
    }
  }

  // A declared mealType should land in its own window (a museum labelled
  // "lunch" at 3pm is wrong even if it's the only "lunch").
  for (const [i, stop] of stops.entries()) {
    if (stop.mealType && !isInMealBlock(toMinutes(stop.arriveTime), MEAL_TIME_WINDOWS[stop.mealType])) {
      errors.push(`stops[${i}] mealType "${stop.mealType}" but arriveTime ${stop.arriveTime} is outside that block`)
    }
  }

  // Coverage (lower bound): a day that ends well short of the window end while
  // unused shortlist pins remain is under-filled. Rejecting it routes the AI's
  // short day to the deterministic fallback, which packs the window. Slack of
  // one stop's duration avoids nagging over a reasonable early finish.
  // ONLY applied when enforceCoverage is true (default); fallback re-validation
  // passes false so its greedy-maximal day isn't rejected (C2 fix).
  if (enforceCoverage && timeWindow?.startTime && timeWindow?.endTime && stops.length > 0) {
    const windowEnd = windowLengthMinutes(timeWindow.startTime, timeWindow.endTime)
    const lastDepart = fromStart(stops[stops.length - 1].departTime)
    const usedIds = new Set(stops.map((s) => s.pinId))
    const unused = shortlist.filter((p) => !usedIds.has(p.id)).length
    if (unused > 0 && windowEnd - lastDepart > AVG_STOP_DURATION_MIN) {
      errors.push(`day ends too early: last stop departs at ${stops[stops.length - 1].departTime}, ${unused} unused places remain`)
    }
  }
}

// Validate an AI (or fallback) itinerary result.
//   result      = parsed JSON, either { feasible:true, ... } or { feasible:false, reason }
//   shortlist   = the pins the itinerary was built from (each with .id + pricePerPerson)
//   constraints = { timeWindow?, maxBudgetPerPerson, ... }
//   options     = { enforceCoverage?: boolean } — defaults true; when false, skips
//                 ONLY the coverage backstop (still runs all other rules including
//                 meals). Used for fallback re-validation so the backstop doesn't
//                 reject the fallback's own greedy-maximal day (C2 fix).
const validateItinerary = (result, shortlist, constraints, options = {}) => {
  const errors = []

  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is not an object'] }
  }
  if (typeof result.feasible !== 'boolean') {
    return { valid: false, errors: ['result.feasible must be a boolean'] }
  }

  // Infeasible is a legitimate answer — just needs a reason.
  if (result.feasible === false) {
    if (typeof result.reason !== 'string' || result.reason.trim() === '') {
      return { valid: false, errors: ['infeasible result must include a non-empty reason'] }
    }
    return { valid: true, errors: [] }
  }

  // Feasible → full structural + business validation.
  if (typeof result.title !== 'string' || result.title.trim() === '') errors.push('title must be a non-empty string')
  if (typeof result.location !== 'string' || result.location.trim() === '') errors.push('location must be a non-empty string')
  if (typeof result.description !== 'string') errors.push('description must be a string')
  if (!Array.isArray(result.stops) || result.stops.length === 0) {
    errors.push('stops must be a non-empty array')
    return { valid: false, errors }
  }

  const shapeOk = result.stops.every((stop, i) => checkStopShape(stop, i, errors))
  // Only run business rules if every stop is structurally sound — otherwise
  // toMinutes/reduce could choke on malformed data.
  if (shapeOk) checkBusinessRules(result.stops, shortlist, constraints, errors, options)

  return { valid: errors.length === 0, errors }
}

export { validateItinerary }
