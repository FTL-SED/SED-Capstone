import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

// Supabase client used for auth: sign-up, login, and verifying access tokens.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Reads the "Authorization: Bearer <token>" header and asks Supabase who the
// token belongs to. Returns the verified user, or null if not signed in.
async function getAuthUser(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null

  if (!token) return null

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data || !data.user) return null

  return { id: data.user.id, email: data.user.email }
}

// POST /users/register
// Creates the Supabase Auth account, then the matching app-side profile row.
async function registerUser(req, res) {
  const { email, password, username } = req.body

  if (!email || !password || !username || typeof username !== 'string') {
    return res
      .status(400)
      .json({ error: 'email, password, and username are required' })
  }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  try {
    const user = await prisma.user.create({
      data: {
        authUserId: data.user.id,
        email: data.user.email,
        username: username.trim(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    })

    // session is null when the project requires email confirmation first.
    return res.status(201).json({ user, session: data.session })
  } catch (err) {
    if (err.code === 'P2002') {
      return res
        .status(409)
        .json({ error: 'That username or email is already taken' })
    }
    throw err
  }
}

// POST /users/login
// Authenticates against Supabase and returns the session (access token) plus
// the app-side profile.
async function loginUser(req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const profile = await prisma.user.findUnique({
    where: { authUserId: data.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
    },
  })

  return res.status(200).json({ user: profile, session: data.session })
}

// PUT /users/:id
// Updates the caller's own profile. Only `username` is editable here; email and
// password are managed by Supabase Auth.
async function updateUser(req, res) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return res.status(401).json({ error: 'You must be signed in' })
  }

  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid user id' })
  }

  const { username } = req.body
  if (username !== undefined) {
    if (typeof username !== 'string' || username.trim() === '') {
      return res
        .status(400)
        .json({ error: 'username must be a non-empty string' })
    }
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (user.authUserId !== authUser.id) {
    return res.status(403).json({ error: 'You can only edit your own profile' })
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(username !== undefined ? { username: username.trim() } : {}),
      },
      select: { id: true, username: true },
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
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return res.status(401).json({ error: 'You must be signed in' })
  }

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

  if (user.authUserId !== authUser.id) {
    return res
      .status(403)
      .json({ error: 'You can only view your own dashboard' })
  }

  return res.status(200).json({
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    createdItineraries: user.createdItineraries,
    bookmarkedItineraries: user.bookmarks.map((b) => b.itinerary),
    likedItineraries: user.likes.map((l) => l.itinerary),
  })
}

export { registerUser, loginUser, updateUser, getUser }