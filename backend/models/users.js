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

// Existence checks for the register pre-validation (username/email uniqueness).
// Return just the id (or null) — the controller only needs to know if one exists.
function findByUsername(username) {
  return prisma.user.findFirst({ where: { username }, select: { id: true } })
}

function findByEmail(email) {
  return prisma.user.findFirst({ where: { email }, select: { id: true } })
}

// Owner dashboard: the user plus their created/bookmarked/liked itineraries.
// All three lists carry creator + a live like count so the home page cards match
// the Explore feed (the controller reshapes them via the itineraries model).
const dashboardItineraryInclude = {
  creator: { select: { id: true, username: true } },
  _count: { select: { likes: true } },
}

function findDashboardById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      createdItineraries: { include: dashboardItineraryInclude },
      bookmarks: { include: { itinerary: { include: dashboardItineraryInclude } } },
      likes: { include: { itinerary: { include: dashboardItineraryInclude } } },
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

export { findByAuthUserId, findByUsername, findByEmail, findDashboardById, create, update }
