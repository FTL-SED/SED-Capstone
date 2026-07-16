// After the route optimizer reorders the stops, their old times no longer make
// sense, so this recomputes the whole schedule for the new order. It keeps each
// stop's dwell time (how long departTime - arriveTime was) and just walks the
// clock forward, adding travel time between stops. Meal stops are held until
// their meal window opens (we wait rather than show up early).
import { MEAL_TIME_WINDOWS, travelMinutesFor } from '../../../config/ai.js'
import { haversineMiles, milesToMeters } from '../../../utils/geo.js'
import { toMinutes, toHHMM } from '../../../utils/time.js'

// stops   = ordered stops, each with arriveTime/departTime (for dwell) + pinId
// coordOf = (stop) => { latitude, longitude }
// startTime = "HH:MM" the day begins (first stop arrives here)
// transport = the group's travel mode (walking/biking/transit/driving); scales
//             travel-time estimates. Undefined ⇒ the default urban speed.
const rescheduleStops = (stops, coordOf, startTime, transport) => {
  const travelMinutes = (miles) => travelMinutesFor(miles, transport)
  let clock = toMinutes(startTime)
  const out = []

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i]
    const dwell = Math.max(0, toMinutes(stop.departTime) - toMinutes(stop.arriveTime))

    if (i > 0) {
      const a = coordOf(stops[i - 1])
      const b = coordOf(stop)
      if (a && b) clock += travelMinutes(haversineMiles(a, b))
    }

    // Hold a meal inside its window: if we'd arrive before it opens, wait so
    // the stop lands in its block (validation rejects a "dinner" stamped at
    // 17:01 when dinner starts 17:30). We only ever delay — arriving late is
    // the caller's/route's problem, not something padding can fix.
    const mealBlock = stop.mealType ? MEAL_TIME_WINDOWS[stop.mealType] : null
    if (mealBlock) {
      clock = Math.max(clock, toMinutes(mealBlock.start))
    }

    const arrive = clock
    const depart = arrive + dwell
    clock = depart

    // Preserve everything the caller set (mealType, note, cost); overwrite only
    // the fields the new order changes.
    out.push({
      ...stop,
      arriveTime: toHHMM(arrive),
      departTime: toHHMM(depart),
    })
  }

  // Backfill travel legs from the recomputed order (last stop has none).
  for (let i = 0; i < out.length - 1; i++) {
    const a = coordOf(stops[i])
    const b = coordOf(stops[i + 1])
    if (a && b) {
      const miles = haversineMiles(a, b)
      out[i].travelTimeToNextMinutes = travelMinutes(miles)
      out[i].distanceToNextMeters = Math.round(milesToMeters(miles))
    } else {
      out[i].travelTimeToNextMinutes = null
      out[i].distanceToNextMeters = null
    }
  }
  if (out.length > 0) {
    const last = out[out.length - 1]
    last.travelTimeToNextMinutes = null
    last.distanceToNextMeters = null
  }

  return out
}

export { rescheduleStops }
