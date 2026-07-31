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

// Saved-preference fields (incl. the privacy flag). Returned by the preferences
// editor and the profile page so the client can show current state. No email —
// this is about prefs, not identity.
const preferencesSelect = {
  id: true,
  isPublic: true,
  interestTags: true,
  foodPrefs: true,
  diets: true,
  defaultStartLabel: true,
  defaultStartLat: true,
  defaultStartLng: true,
}

// What a user-search result exposes about ANOTHER user. Never email. Includes
// the preference snapshot so "add group member by username" can pre-fill a new
// member without a second request. Only returned for isPublic users.
const publicSnapshotSelect = {
  id: true,
  username: true,
  avatarUrl: true,
  interestTags: true,
  foodPrefs: true,
  diets: true,
  defaultStartLabel: true,
  defaultStartLat: true,
  defaultStartLng: true,
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
      visited: { include: { itinerary: { include: dashboardItineraryInclude } } },
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

// Persist a subset of the caller's saved preferences (incl. isPublic). The
// controller validates/whitelists the fields; this just writes and returns the
// preference view so the client can reflect the saved state.
function updatePreferences(id, data) {
  return prisma.user.update({
    where: { id },
    data,
    select: preferencesSelect,
  })
}

// Read the caller's own saved preferences (for the profile page / editor).
function findPreferencesById(id) {
  return prisma.user.findUnique({ where: { id }, select: preferencesSelect })
}

// Case-insensitive username-substring search. Matches PUBLIC users, plus the
// caller themselves (`includeSelfId`) even when their profile is private — you
// can always add yourself to your own trip. Returns the public prefs snapshot
// for each match, capped by `take`.
function searchPublicByUsername(query, { includeSelfId, take = 10 } = {}) {
  return prisma.user.findMany({
    where: {
      username: { contains: query, mode: 'insensitive' },
      // Public to everyone, OR it's the caller's own (private-or-not) account.
      OR: [
        { isPublic: true },
        ...(includeSelfId != null ? [{ id: includeSelfId }] : []),
      ],
    },
    select: publicSnapshotSelect,
    orderBy: { username: 'asc' },
    take,
  })
}

export {
  findByAuthUserId,
  findByUsername,
  findByEmail,
  findDashboardById,
  create,
  update,
  updatePreferences,
  findPreferencesById,
  searchPublicByUsername,
}
