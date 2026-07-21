// Loads the entire Pin catalog (now pure venues, no itinerary tie) into the
// engine's pin shape via mapVenue. No privacy filter needed — pins are now
// venue definitions, not per-itinerary stops.
import prisma from '../../../lib/prisma.js'
import { mapVenue } from './mapVenue.js'
import { dayKeyFromDate } from '../../../utils/hours.js'

// Factory so tests can inject a prisma mock.
function makeGetAllPins(client) {
  return async function getAllPins(tripDate) {
    const pins = await client.pin.findMany()
    // Resolve the trip's weekday once, not once per pin — tripDate is constant
    // across the whole catalog map.
    const dayKey = dayKeyFromDate(tripDate)
    return pins.map((pin) => mapVenue(pin, tripDate, dayKey))
  }
}

const getAllPins = makeGetAllPins(prisma)

export { getAllPins, makeGetAllPins }
