// Data-access wrapper for the Pin table. Thin — no business logic, no
// req/res (see .claude/rules/backend.md → Models).
import prisma from '../lib/prisma.js'

// Pin plus its parent itinerary, for read/ownership checks.
function findByIdWithItinerary(id) {
  return prisma.pin.findUnique({ where: { id }, include: { itinerary: true } })
}

function create(data) {
  return prisma.pin.create({ data })
}

// The caller passes only the fields being changed; the returned `select`
// mirrors those keys (plus id) so the response echoes exactly what changed.
function update(id, data) {
  return prisma.pin.update({
    where: { id },
    data,
    select: { id: true, ...Object.fromEntries(Object.keys(data).map((k) => [k, true])) },
  })
}

function remove(id) {
  return prisma.pin.delete({ where: { id } })
}

export { findByIdWithItinerary, create, update, remove }
