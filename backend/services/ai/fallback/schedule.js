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
import { MEAL_TIME_WINDOWS, MAX_STOP_DURATION_MIN, STOP_STRETCH_MAX_MIN, TAIL_SNAP_MAX_MIN, travelMinutesFor } from '../../../config/ai.js'
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

  // Each stop's natural dwell — the per-stop stretch anchor (fill may grow it to
  // at most baseline + STOP_STRETCH_MAX_MIN, never past MAX_STOP_DURATION_MIN).
  // Prefer an explicit `durationMinutes` (the scheduler+narrator path assigns
  // times itself, so its stops carry only a duration); otherwise derive dwell
  // from the stop's existing arrive/depart (the deterministic sequencer's stops
  // already carry real times). Measured in elapsed space so a stop straddling
  // midnight reads as a positive dwell.
  const dwells = stops.map((stop) =>
    typeof stop.durationMinutes === 'number'
      ? Math.max(0, stop.durationMinutes)
      : Math.max(0, minutesFromStart(stop.arriveTime, stop.departTime)),
  )
  const baseline = [...dwells]
  const isMeal = (i) => stops[i].mealType !== undefined

  // Per-stop stretch allowance for the fill. STOP_STRETCH_MAX_MIN is the FLOOR,
  // not a flat cap: on a rich day (enough stops to fill the window at natural
  // dwell) the extra slack needed is small, so the allowance stays ~30 and a
  // coffee never balloons. On a SPARSE day (few stops, wide window) the flat 30
  // couldn't reach the window end — leaving the day hours short — so we widen the
  // allowance to the slack the day actually needs, spread across the non-meal
  // stops that can absorb it. Always bounded by MAX_STOP_DURATION_MIN so no stop
  // becomes absurd. `windowEndElapsed` is undefined when fill is off (deterministic
  // sequencer's own pass), in which case the flat floor applies.
  const stretchAllowance = (() => {
    const windowEnd = options.windowEndElapsed
    if (typeof windowEnd !== 'number' || windowEnd <= 0) return STOP_STRETCH_MAX_MIN
    const totalTravel = travelInto.reduce((s, t) => s + t, 0)
    const totalBaseline = baseline.reduce((s, d) => s + d, 0)
    const stretchable = stops.reduce((n, _, i) => (isMeal(i) ? n : n + 1), 0)
    if (stretchable === 0) return STOP_STRETCH_MAX_MIN
    const gap = windowEnd - (totalTravel + totalBaseline)
    // Per-stretchable-stop share of the gap, never below the flat floor.
    return Math.max(STOP_STRETCH_MAX_MIN, Math.ceil(gap / stretchable))
  })()
  const dwellCap = (i) => Math.min(MAX_STOP_DURATION_MIN, baseline[i] + stretchAllowance)

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

    // Tail-snap: after filling, if the last stop still departs within
    // TAIL_SNAP_MAX_MIN of the window end, extend its dwell to land EXACTLY on the
    // end for a clean finish. Only a SMALL residual is closed (a far-short day is
    // left honest). A trailing MEAL is snapped too — extending its dwell moves
    // only its depart, not its arrival, so it stays inside its block (isLegal
    // still guards this), and a dinner running to the window end reads naturally.
    const filled = layout(dwells)
    const lastIdx = stops.length - 1
    const residual = windowEndElapsed - filled.depart[lastIdx]
    if (residual > 0 && residual <= TAIL_SNAP_MAX_MIN) {
      dwells[lastIdx] += residual
      // Revert if the extra somehow breaks legality (window overrun / a meal's
      // arrival pushed out of its block by the re-layout).
      if (!isLegal(layout(dwells))) dwells[lastIdx] -= residual
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
