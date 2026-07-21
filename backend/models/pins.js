// Data-access wrapper for the Pin table. Thin — no business logic, no
// req/res (see .claude/rules/backend.md → Models). Post the Pin/ItineraryStop
// split, Pin is a venue catalog: the recommendation engine reads it, and
// pinController creates a venue when a stop references a brand-new place.
import prisma from '../lib/prisma.js'

function findById(id) {
  return prisma.pin.findUnique({ where: { id } })
}

function create(data) {
  return prisma.pin.create({ data })
}

export { findById, create }
