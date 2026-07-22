// Data-access wrapper for the Pin table. Thin — no business logic, no
// req/res (see .claude/rules/backend.md → Models). Post the Pin/ItineraryStop
// split, Pin is a venue catalog: the recommendation engine reads it, and
// pinController creates a venue when a stop references a brand-new place.
import prisma from '../lib/prisma.js'

function findById(id) {
  return prisma.pin.findUnique({ where: { id } })
}

// Browse/search the venue catalog so a user can pick a place to add to their
// itinerary. `q` matches the venue name (case-insensitive); `category` filters
// restaurant vs activity. Ordered by rating (best first, nulls last) then name.
function findMany({ q, category, take = 20, skip = 0 } = {}) {
  const where = {}
  if (q) where.name = { contains: q, mode: 'insensitive' }
  if (category) where.category = category
  return prisma.pin.findMany({
    where,
    orderBy: [{ rating: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
    take,
    skip,
  })
}

function create(data) {
  return prisma.pin.create({ data })
}

export { findById, findMany, create }
