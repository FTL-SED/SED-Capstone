// Re-walk the clock over an ordered list of stops. Used after route
// optimization reorders stops: arrive/depart times and travel legs must be
// recomputed so they match the NEW order. Preserves each stop's original dwell
// duration (departTime - arriveTime) — the AI may have reasoned about how long
// to spend — and only shifts start times to account for travel between stops.
// Pure: stops + coord lookup + start time in, a fresh stops array out.
import { FALLBACK_TRAVEL_MPH } from '../../config/ai.js'
import { haversineMiles, milesToMeters } from '../../utils/geo.js'

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const toHHMM = (mins) => {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const travelMinutes = (miles) => Math.round((miles / FALLBACK_TRAVEL_MPH) * 60)

// stops   = ordered stops, each with arriveTime/departTime (for dwell) + pinId
// coordOf = (stop) => { latitude, longitude }
// startTime = "HH:MM" the day begins (first stop arrives here)
function rescheduleStops(stops, coordOf, startTime) {
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
