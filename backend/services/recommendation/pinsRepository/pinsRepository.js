// Loads the seeded venue catalog (Pin rows with no parent itinerary) into the
// engine's pin shape via mapVenue. Catalog-only scoping (itineraryId = null)
// means: no private-draft pin can leak (nothing to leak — catalog pins have no
// itinerary), and no cross-itinerary duplicate can appear (a venue is one
// catalog row), so the old dedupePins + privacy-OR are both gone.
import prisma from '../../../lib/prisma.js'
import { mapVenue } from './mapVenue.js'

// Factory so tests can inject a prisma mock.
function makeGetAllPins(client) {
  return async function getAllPins(tripDate) {
    const pins = await client.pin.findMany({ where: { itineraryId: null } })
    return pins.map((pin) => mapVenue(pin, tripDate))
  }
}

const getAllPins = makeGetAllPins(prisma)

export { getAllPins, makeGetAllPins }
