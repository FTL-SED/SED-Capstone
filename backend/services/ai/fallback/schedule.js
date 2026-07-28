// After the route optimizer reorders the stops, their old times no longer make
// sense, so this recomputes the whole schedule for the new order. It keeps each
// stop's dwell time (how long departTime - arriveTime was) and just walks the
// clock forward, adding travel time between stops. Meal stops are held until
// their meal window opens (we wait rather than show up early).
//
// It can optionally FILL the window: when a thin shortlist can't fill the day at
// natural dwell lengths, grow the non-meal dwells so the day reaches the window
// end instead of quitting hours early. Each stop may grow only STOP_STRETCH_MAX_MIN
// beyond its own baseline dwell (so a 45-min café can't become a 3-hour event),
// and growth is DISTRIBUTED round-robin across stops (each gets a little longer)
// rather than piling onto one. Meals are never stretched or pushed past their block.
import { MEAL_TIME_WINDOWS, MAX_STOP_DURATION_MIN, STOP_STRETCH_MAX_MIN, travelMinutesFor } from '../../../config/ai.js'
import { haversineMiles } from '../../../utils/geo.js'
import { toMinutes, toHHMM, minutesFromStart, MINUTES_PER_DAY } from '../../../utils/time.js'
import { backfillTravelLegs } from './travelLegs.js'

// The step the fill grows a dwell by each round. A coarse step keeps the greedy
// loop cheap and its output stable/deterministic.
const FILL_STEP_MIN = 15

// stops   = ordered stops, each with arriveTime/departTime (for dwell) + pinId
// coordOf = (stop) => { latitude, longitude }
// startTime = "HH:MM" the day begins (first stop arrives here)
// transport = the group's travel mode (walking/biking/transit/driving); scales
//             travel-time estimates. Undefined ⇒ the default urban speed.
// options.windowEndElapsed = when set (elapsed minutes from startTime), fill the
//             day by stretching non-meal dwells so the last stop departs near it.
//             Only honored for a same-day window (no midnight crossing).
const rescheduleStops = (stops, coordOf, startTime, transport, options = {}) => {
  const travelMinutes = (miles) => travelMinutesFor(miles, transport)
  // Walk the clock in ELAPSED minutes from the day's start (0-based) so an
  // overnight schedule crosses midnight cleanly; recover wall-clock only for
  // meal-window holds and HH:MM output.
  const startWall = toMinutes(startTime)
  const wallAt = (elapsed) => (startWall + elapsed) % MINUTES_PER_DAY

  // Travel minutes into each stop (0 for the first). Fixed by the order/coords,
  // independent of dwell, so compute once and reuse across fill iterations.
  const travelInto = stops.map((stop, i) => {
    if (i === 0) return 0
    const a = coordOf(stops[i - 1])
    const b = coordOf(stop)
    return a && b ? travelMinutes(haversineMiles(a, b)) : 0
  })

  // Each stop's natural dwell (preserved from the input), measured in elapsed
  // space so a stop straddling midnight reads as a positive dwell. This baseline
  // is also the per-stop stretch anchor: the fill may grow a dwell to at most
  // baseline + STOP_STRETCH_MAX_MIN (and never past MAX_STOP_DURATION_MIN).
  const dwells = stops.map((stop) => Math.max(0, minutesFromStart(stop.arriveTime, stop.departTime)))
  const baseline = [...dwells]
  const dwellCap = (i) => Math.min(MAX_STOP_DURATION_MIN, baseline[i] + STOP_STRETCH_MAX_MIN)

  const isMeal = (i) => stops[i].mealType !== undefined

  // Lay out arrive/depart (elapsed) for a given dwell set, holding each meal
  // until its block opens. Returns { arrive[], depart[] }.
  const layout = (dwellSet) => {
    const arrive = new Array(stops.length)
    const depart = new Array(stops.length)
    let clock = 0
    for (let i = 0; i < stops.length; i++) {
      clock += travelInto[i]
      const mealBlock = stops[i].mealType ? MEAL_TIME_WINDOWS[stops[i].mealType] : null
      if (mealBlock) {
        // Meal windows are absolute daytime: if we'd arrive before the block
        // opens today, wait the difference (keeps the overnight walk consistent).
        const nowWall = wallAt(clock)
        const openWall = toMinutes(mealBlock.start)
        if (nowWall < openWall) clock += openWall - nowWall
      }
      arrive[i] = clock
      depart[i] = clock + dwellSet[i]
      clock = depart[i]
    }
    return { arrive, depart }
  }

  // Fill the day: greedily grow the earliest non-meal dwell that can absorb more
  // time, one FILL_STEP_MIN at a time, until the last stop departs within one
  // step of the window end or nothing can grow. Growing an earlier stop pushes
  // later ones back — closing interior idle gaps AND extending the tail — while
  // the per-step re-check guarantees no meal is shoved past its block end and the
  // day never overruns the window. Same-day windows only.
  const { windowEndElapsed } = options
  const canFill =
    typeof windowEndElapsed === 'number' &&
    windowEndElapsed > 0 &&
    startWall + windowEndElapsed <= MINUTES_PER_DAY

  if (canFill) {
    // A grown layout is legal when every meal still arrives inside its block and
    // the last stop departs no later than the window end.
    const isLegal = ({ arrive, depart }) => {
      if (depart[stops.length - 1] > windowEndElapsed) return false
      for (let i = 0; i < stops.length; i++) {
        if (!isMeal(i)) continue
        const blockEndWall = toMinutes(MEAL_TIME_WINDOWS[stops[i].mealType].end)
        if (wallAt(arrive[i]) > blockEndWall) return false
      }
      return true
    }

    // Bound the loop: at most enough steps to fill the whole window from scratch.
    const maxIterations = Math.ceil(windowEndElapsed / FILL_STEP_MIN) + stops.length
    // Round-robin cursor: each iteration starts scanning one stop further along,
    // so growth is spread across stops (each gets a little longer) instead of
    // piling all the slack onto the earliest stop.
    let cursor = 0
    for (let iter = 0; iter < maxIterations; iter++) {
      const current = layout(dwells)
      if (windowEndElapsed - current.depart[stops.length - 1] <= FILL_STEP_MIN) break

      let grew = false
      for (let k = 0; k < stops.length; k++) {
        const i = (cursor + k) % stops.length
        // Skip meals and any stop already at its per-stop stretch cap.
        if (isMeal(i) || dwells[i] + FILL_STEP_MIN > dwellCap(i)) continue
        dwells[i] += FILL_STEP_MIN
        if (isLegal(layout(dwells))) {
          cursor = (i + 1) % stops.length // next round starts after this stop
          grew = true
          break
        }
        dwells[i] -= FILL_STEP_MIN // revert: this stop can't absorb more
      }
      if (!grew) break
    }
  }

  const { arrive, depart } = layout(dwells)
  const out = stops.map((stop, i) => ({
    // Preserve everything the caller set (mealType, note, cost); overwrite only
    // the fields the new order/dwell changes.
    ...stop,
    arriveTime: toHHMM(wallAt(arrive[i])),
    departTime: toHHMM(wallAt(depart[i])),
  }))

  // Backfill travel legs from the recomputed order (last stop has none).
  backfillTravelLegs(out, (stop, i) => coordOf(stops[i]), transport)

  return out
}

export { rescheduleStops }
