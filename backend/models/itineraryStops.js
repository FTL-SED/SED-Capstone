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

export { create, findByIdWithItinerary, update, remove }
