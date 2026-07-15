// Data-access wrapper for the Like table. Thin — no business logic, no
// req/res (see .claude/rules/backend.md → Models).
import prisma from '../lib/prisma.js'

// Adds the like if absent, no-op if it already exists (safe to call repeatedly).
function upsert(userId, itineraryId) {
  return prisma.like.upsert({
    where: { userId_itineraryId: { userId, itineraryId } },
    create: { userId, itineraryId },
    update: {},
  })
}

// Removes the like if present, no-op otherwise (safe to call repeatedly).
function remove(userId, itineraryId) {
  return prisma.like.deleteMany({ where: { userId, itineraryId } })
}

function countForItinerary(itineraryId) {
  return prisma.like.count({ where: { itineraryId } })
}

export { upsert, remove, countForItinerary }
