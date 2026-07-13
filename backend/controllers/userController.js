const prisma = require('../lib/prisma')

// POST /users
// Creates the app-side profile row for a newly registered Supabase Auth user.
// The caller is identified by their verified Supabase session (req.authUser),
// not by anything in the request body. Password/email are owned by Supabase.
async function createUser(req, res) {
  const { username } = req.body

  if (!username || typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({ error: 'username is required' })
  }

  const existing = await prisma.user.findUnique({
    where: { authUserId: req.authUser.id },
  })

  if (existing) {
    return res
      .status(409)
      .json({ error: 'A profile already exists for this account' })
  }

  try {
    const user = await prisma.user.create({
      data: {
        authUserId: req.authUser.id,
        email: req.authUser.email,
        username: username.trim(),
      },
      select: {
        id: true,
        authUserId: true,
        username: true,
        email: true,
        createdAt: true,
      },
    })

    return res.status(201).json(user)
  } catch (err) {
    if (err.code === 'P2002') {
      return res
        .status(409)
        .json({ error: 'That username or email is already taken' })
    }
    throw err
  }
}

// PUT /users/:id
// Updates the caller's own profile. Email/password changes go through Supabase
// Auth directly, so only `username` is editable here.
async function updateUser(req, res) {
  const id = Number(req.params.id)

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid user id' })
  }

  const { username } = req.body

  if (username !== undefined) {
    if (typeof username !== 'string' || username.trim() === '') {
      return res.status(400).json({ error: 'username must be a non-empty string' })
    }
  }

  const user = await prisma.user.findUnique({ where: { id } })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (user.authUserId !== req.authUser.id) {
    return res.status(403).json({ error: 'You can only edit your own profile' })
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(username !== undefined ? { username: username.trim() } : {}),
      },
      select: {
        id: true,
        username: true,
      },
    })

    return res.status(200).json(updated)
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'That username is already taken' })
    }
    throw err
  }
}

// GET /users/:id
// Returns the owner's private dashboard data. A user may only fetch their own
// record, so email and the saved/liked lists are never exposed for another id.
async function getUser(req, res) {
  const id = Number(req.params.id)

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid user id' })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      createdItineraries: true,
      bookmarks: { include: { itinerary: true } },
      likes: { include: { itinerary: true } },
    },
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (user.authUserId !== req.authUser.id) {
    return res.status(403).json({ error: 'You can only view your own dashboard' })
  }

  return res.status(200).json({
    id: user.id,
    authUserId: user.authUserId,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    createdItineraries: user.createdItineraries,
    bookmarkedItineraries: user.bookmarks.map((b) => b.itinerary),
    likedItineraries: user.likes.map((l) => l.itinerary),
  })
}

module.exports = { createUser, updateUser, getUser }
