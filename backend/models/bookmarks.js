// Data-access wrapper for the Bookmark table. Thin — no business logic, no
// req/res (see .claude/rules/backend.md → Models).
import prisma from '../lib/prisma.js'

// Adds the bookmark if absent, no-op if it already exists (safe to call repeatedly).
function upsert(userId, itineraryId) {
  return prisma.bookmark.upsert({
    where: { userId_itineraryId: { userId, itineraryId } },
    create: { userId, itineraryId },
    update: {},
  })
}

// Removes the bookmark if present, no-op otherwise (safe to call repeatedly).
function remove(userId, itineraryId) {
  return prisma.bookmark.deleteMany({ where: { userId, itineraryId } })
}

export { upsert, remove }
