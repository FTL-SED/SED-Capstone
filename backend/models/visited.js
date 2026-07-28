// Data-access wrapper for the Visited table. Thin — no business logic, no
// req/res (see .claude/rules/backend.md → Models). Mirrors likes.js/bookmarks.js,
// but the row's visitedAt refreshes on re-visit (via @updatedAt in the schema),
// so update:{} is enough to bump the timestamp.
import prisma from '../lib/prisma.js'

// Records a visit if absent, refreshes visitedAt if present (safe to call repeatedly).
function upsert(userId, itineraryId) {
  return prisma.visited.upsert({
    where: { userId_itineraryId: { userId, itineraryId } },
    create: { userId, itineraryId },
    update: {}, // @updatedAt bumps visitedAt even on a no-op update
  })
}

// Removes the visit if present, no-op otherwise (safe to call repeatedly).
function remove(userId, itineraryId) {
  return prisma.visited.deleteMany({ where: { userId, itineraryId } })
}

export { upsert, remove }
