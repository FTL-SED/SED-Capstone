// Data-access wrapper for the User table. Thin — no business logic, no
// req/res. Every User query in the app goes through here (see
// .claude/rules/backend.md → Models).
import prisma from '../lib/prisma.js'

// Public-safe profile fields returned to clients.
const profileSelect = {
  id: true,
  username: true,
  email: true,
  avatarUrl: true,
  createdAt: true,
}

function findByAuthUserId(authUserId) {
  return prisma.user.findUnique({ where: { authUserId } })
}

// Owner dashboard: the user plus their created itineraries and the
// itineraries they've bookmarked/liked.
function findDashboardById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      createdItineraries: true,
      bookmarks: { include: { itinerary: true } },
      likes: { include: { itinerary: true } },
    },
  })
}

function create({ authUserId, email, username }) {
  return prisma.user.create({
    data: { authUserId, email, username },
    select: profileSelect,
  })
}

function update(id, data) {
  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, avatarUrl: true },
  })
}

export { findByAuthUserId, findDashboardById, create, update }
