// Adds one stop to an itinerary. Two shapes:
//   - reference an existing venue: pass `pinId` on the stop, no `venue`.
//   - create a new catalog venue + the stop: pass `venue` (its fields); the two
//     writes run in a single transaction so a failed stop-create can never leave
//     an orphan venue Pin behind.
// The controller owns all HTTP validation; this service owns the multi-write
// orchestration + atomicity (see .claude/rules/backend.md → Services). The
// existing-venue path goes through the itineraryStops model; the venue-creating
// path needs prisma.$transaction directly (model wrappers can't take a tx
// handle), which is the sanctioned reason a service touches prisma.
import prisma from '../../lib/prisma.js'
import * as itineraryStops from '../../models/itineraryStops.js'

// stop = { pinId?, itineraryId, orderInItinerary, startTime, endTime,
//          travelTimeToNextMinutes?, distanceToNextMeters?, mealType?, note? }
// venue = venue-Pin fields when creating a new catalog place (else undefined).
// Returns the created ItineraryStop with its `pin` included.
async function addStop(stop, venue) {
  if (!venue) {
    // Referencing an existing venue — a single write via the model.
    return itineraryStops.create(stop)
  }

  // New venue + its stop: atomic. If either write throws, neither commits, so
  // there's no dangling catalog Pin without a stop.
  return prisma.$transaction(async (tx) => {
    const created = await tx.pin.create({ data: { ...venue, itineraryId: null } })
    return tx.itineraryStop.create({
      data: { ...stop, pinId: created.id },
      include: { pin: true },
    })
  })
}

export { addStop }
