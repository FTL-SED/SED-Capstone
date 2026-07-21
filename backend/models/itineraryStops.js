// Thin data-access wrapper for the ItineraryStop table (see .claude/rules/backend.md).
import prisma from '../lib/prisma.js'

function createMany(stops) {
  return prisma.itineraryStop.createMany({ data: stops })
}

function create(data) {
  return prisma.itineraryStop.create({ data, include: { pin: true } })
}

function findByItinerary(itineraryId) {
  return prisma.itineraryStop.findMany({
    where: { itineraryId },
    orderBy: { orderInItinerary: 'asc' },
    include: { pin: true },
  })
}

function findByIdWithItinerary(id) {
  return prisma.itineraryStop.findUnique({
    where: { id },
    include: { pin: true, itinerary: true },
  })
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

function deleteByItinerary(itineraryId) {
  return prisma.itineraryStop.deleteMany({ where: { itineraryId } })
}

export { createMany, create, findByItinerary, findByIdWithItinerary, update, remove, deleteByItinerary }
