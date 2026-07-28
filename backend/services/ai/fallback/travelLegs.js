// Shared travel-leg backfill for the fallback sequencer and the reschedule
// step. Each stop stores travel to the NEXT stop; the last stop (and any leg
// with a missing coordinate) gets null for both fields. Mutates in place.
import { travelMinutesFor } from '../../../config/ai.js'
import { haversineMiles, milesToMeters } from '../../../utils/geo.js'

export function backfillTravelLegs(stops, coordOf, transport) {
  for (let i = 0; i < stops.length; i++) {
    if (i === stops.length - 1) {
      stops[i].travelTimeToNextMinutes = null
      stops[i].distanceToNextMeters = null
      continue
    }
    const a = coordOf(stops[i], i)
    const b = coordOf(stops[i + 1], i + 1)
    if (a && b) {
      const miles = haversineMiles(a, b)
      stops[i].travelTimeToNextMinutes = travelMinutesFor(miles, transport)
      stops[i].distanceToNextMeters = Math.round(milesToMeters(miles))
    } else {
      stops[i].travelTimeToNextMinutes = null
      stops[i].distanceToNextMeters = null
    }
  }
}
