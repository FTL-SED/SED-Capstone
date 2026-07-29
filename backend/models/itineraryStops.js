// Thin data-access wrapper for the ItineraryStop table (see .claude/rules/backend.md).
import prisma from '../lib/prisma.js'

function create(data) {
  return prisma.itineraryStop.create({ data, include: { pin: true } })
}

function findByIdWithItinerary(id) {
  return prisma.itineraryStop.findUnique({
    where: { id },
    include: { pin: true, itinerary: true },
  })
}

function findManyByItinerary(itineraryId) {
  return prisma.itineraryStop.findMany({ where: { itineraryId } })
}

function update(id, data) {
  return prisma.itineraryStop.update({
    where: { id },
    data,
    include: { pin: true },
  })
}

function remove(id) {
  return prisma.itineraryStop.delete({ where: { id } })
}

function findManyByItineraryWithPins(itineraryId) {
  return prisma.itineraryStop.findMany({
    where: { itineraryId },
    include: { pin: true },
    orderBy: { orderInItinerary: 'asc' },
  })
}

// Persist a full reorder atomically, scoped to the specified itineraryId.
// @@unique([itineraryId, orderInItinerary]) is not deferrable, so a one-pass write
// that swaps two stops' orders can transiently collide. Two phases inside one transaction:
// first park every stop at a negative (collision-free) order, then write the final order
// + recomputed times/travel. Updates are scoped to itineraryId so foreign stops fail fast.
// rows = [{ id, orderInItinerary, startTime, endTime,
//           travelTimeToNextMinutes, distanceToNextMeters }]
function reorderStops(itineraryId, rows) {
  return prisma.$transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      await tx.itineraryStop.update({
        where: { id: rows[i].id, itineraryId },
        data: { orderInItinerary: -1 - i },
      })
    }
    for (const r of rows) {
      await tx.itineraryStop.update({
        where: { id: r.id, itineraryId },
        data: {
          orderInItinerary: r.orderInItinerary,
          startTime: r.startTime,
          endTime: r.endTime,
          travelTimeToNextMinutes: r.travelTimeToNextMinutes,
          distanceToNextMeters: r.distanceToNextMeters,
        },
      })
    }
  })
}

export { create, findByIdWithItinerary, findManyByItinerary, findManyByItineraryWithPins, update, remove, reorderStops }
