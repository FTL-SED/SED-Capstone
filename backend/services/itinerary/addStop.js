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
    // Find-or-create the venue: reuse an existing catalog Pin that matches by
    // name + coords (rounded to 4dp, the same key the seed loader dedupes on) so
    // repeatedly adding the same place doesn't bloat the shared catalog the
    // recommendation engine reads. Coords are compared within a small epsilon
    // because they're stored as full-precision floats.
    const EPS = 0.00005 // ~half of 4dp (~5.5m)
    const existing = await tx.pin.findFirst({
      where: {
        name: venue.name,
        latitude: { gte: venue.latitude - EPS, lte: venue.latitude + EPS },
        longitude: { gte: venue.longitude - EPS, lte: venue.longitude + EPS },
      },
    })
    const pin = existing ?? (await tx.pin.create({ data: venue }))
    return tx.itineraryStop.create({
      data: { ...stop, pinId: pin.id },
      include: { pin: true },
    })
  })
}

export { addStop }
