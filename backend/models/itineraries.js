// Data-access wrapper for the Itinerary table. Thin — no business logic, no
// req/res (see .claude/rules/backend.md → Models).
import prisma from '../lib/prisma.js'

// Shared shape for itinerary responses: the creator summary and pins in order.
const itineraryInclude = {
  creator: { select: { id: true, username: true } },
  pins: { orderBy: { orderInItinerary: 'asc' } },
}

function create(data) {
  return prisma.itinerary.create({ data, include: itineraryInclude })
}

function findMany({ where, orderBy, take, skip }) {
  return prisma.itinerary.findMany({
    where,
    orderBy,
    take,
    skip,
    include: itineraryInclude,
  })
}

// Full record with creator + ordered pins, for detail views.
function findById(id) {
  return prisma.itinerary.findUnique({ where: { id }, include: itineraryInclude })
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

function updateLikeCount(id, likeCount) {
  return prisma.itinerary.update({ where: { id }, data: { likeCount } })
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
  updateLikeCount,
  remove,
}
