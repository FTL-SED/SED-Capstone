// Data-access wrapper for the Itinerary table. Thin — no business logic, no
// req/res (see .claude/rules/backend.md → Models).
import prisma from '../lib/prisma.js'

// Shared shape for itinerary responses: the creator summary, pins in order, and
// a live count of likes (the Like rows are the single source of truth — there is
// no stored likeCount column).
const itineraryInclude = {
  creator: { select: { id: true, username: true } },
  pins: { orderBy: { orderInItinerary: 'asc' } },
  _count: { select: { likes: true } },
}

// Reshape Prisma's `{ _count: { likes } }` into the flat `likeCount` the API
// returns, so callers and the frontend see the same field name as before.
function withLikeCount(itinerary) {
  if (!itinerary) return itinerary
  const { _count, ...rest } = itinerary
  return { ...rest, likeCount: _count?.likes ?? 0 }
}

async function create(data) {
  const itinerary = await prisma.itinerary.create({ data, include: itineraryInclude })
  return withLikeCount(itinerary)
}

async function findMany({ where, orderBy, take, skip }) {
  const rows = await prisma.itinerary.findMany({
    where,
    orderBy,
    take,
    skip,
    include: itineraryInclude,
  })
  return rows.map(withLikeCount)
}

// Full record with creator + ordered pins, for detail views.
async function findById(id) {
  const itinerary = await prisma.itinerary.findUnique({ where: { id }, include: itineraryInclude })
  return withLikeCount(itinerary)
}

// Bare record, for ownership/existence checks that don't need relations.
function findByIdBasic(id) {
  return prisma.itinerary.findUnique({ where: { id } })
}

// Record plus its pins in order, for deep-copying.
function findByIdWithPins(id) {
  return prisma.itinerary.findUnique({
    where: { id },
    include: { pins: { orderBy: { orderInItinerary: 'asc' } } },
  })
}

// The caller passes only the fields being changed; the returned `select`
// mirrors those keys (plus id) so the response echoes exactly what changed.
function update(id, data) {
  return prisma.itinerary.update({
    where: { id },
    data,
    select: { id: true, ...Object.fromEntries(Object.keys(data).map((k) => [k, true])) },
  })
}

function remove(id) {
  return prisma.itinerary.delete({ where: { id } })
}

export {
  itineraryInclude,
  create,
  findMany,
  findById,
  findByIdBasic,
  findByIdWithPins,
  update,
  remove,
}
