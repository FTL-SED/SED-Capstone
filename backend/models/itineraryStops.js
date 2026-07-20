// Thin data-access wrapper for the ItineraryStop table (see .claude/rules/backend.md).
import prisma from '../lib/prisma.js'

function createMany(stops) {
  return prisma.itineraryStop.createMany({ data: stops })
}

function findByItinerary(itineraryId) {
  return prisma.itineraryStop.findMany({
    where: { itineraryId },
    orderBy: { orderInItinerary: 'asc' },
    include: { pin: true },
  })
}

function deleteByItinerary(itineraryId) {
  return prisma.itineraryStop.deleteMany({ where: { itineraryId } })
}

export { createMany, findByItinerary, deleteByItinerary }
