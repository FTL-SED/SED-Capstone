import supabase from '../lib/supabase.js'
import * as users from '../models/users.js'

// POST /users/register
// Creates the Supabase Auth account, then the matching app-side profile row.
async function registerUser(req, res) {
  const { email, password, username } = req.body

  if (!email || !password || !username || typeof username !== 'string') {
    
    return res
      .status(400)
      .json({ error: 'Email, Password, and Username are required.' })
  }

  try {
    // Username lives in our User table (not in Supabase Auth), so check it here.
    const { data: existingUsername } = await supabase
      .from('User')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle()

    if (existingUsername) {
      return res
        .status(409)
        .json({ error: 'That username is already taken. Please pick another.' })
    }

    const { data: existingEmail } = await supabase
      .from('User')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingEmail) {
      return res
        .status(409)
        .json({ error: 'That email is already registered. Try logging in.' })
    }

    // Email is owned by Supabase Auth, so let signUp be the authority on it.
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      // Log the raw error for us, but send the user a friendly message.
      console.error('Supabase signUp error:', error.code, error.message)

      if (error.code === 'user_already_exists' || error.code === 'email_exists') {
        return res
          .status(409)
          .json({ error: 'That email is already registered. Try logging in.' })
      }
      if (error.code === 'weak_password') {
        return res
          .status(400)
          .json({ error: 'Password must be 8+ characters and include a-z, A-Z, 0-9, and a special character.' })
      }
      if (error.code === 'email_address_invalid' || error.code === 'validation_failed') {
        return res
          .status(400)
          .json({ error: 'Please enter a valid email address.' })
      }
      if (error.status === 429) {
        return res
          .status(429)
          .json({ error: 'Too many attempts. Please wait a minute and try again.' })
      }

      return res
        .status(400)
        .json({ error: 'Could not create your account. Please try again.' })
    }

    const user = await users.create({
      authUserId: data.user.id,
      email: data.user.email,
      username: username.trim(),
    })

    // session is null when the project requires email confirmation first.
    return res.status(201).json({ user, session: data.session })
  } catch (err) {
    // Safety net for the rare race where two identical signups slip past the
    // pre-checks and collide on the DB's unique constraint.
    if (err.code === 'P2002') {
      return res
        .status(409)
        .json({ error: 'That username or email was just taken. Please try again.' })
    }
    console.error('registerUser error:', err)
    return res
      .status(500)
      .json({ error: 'Something went wrong on our end. Please try again.' })
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
    console.error('Supabase signIn error:', error.code, error.message)

    if (error.status === 429) {
      return res
        .status(429)
        .json({ error: 'Too many attempts. Please wait a minute and try again.' })
    }

    // Wrong email or wrong password — Supabase won't say which, by design.
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const profile = await users.findByAuthUserId(data.user.id)

  return res.status(200).json({ user: profile, session: data.session })
}

// PUT /users/:id
// Updates the caller's own profile. Only `username` is editable here; email and
// password are managed by Supabase Auth. Auth is handled by requireAuth.
async function updateUser(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid user id' })
  }

  if (req.user.id !== id) {
    return res.status(403).json({ error: 'You can only edit your own profile' })
  }

  const { username } = req.body
  if (username !== undefined) {
    if (typeof username !== 'string' || username.trim() === '') {
      return res
        .status(400)
        .json({ error: 'username must be a non-empty string' })
    }
  }

  try {
    const updated = await users.update(id, {
      ...(username !== undefined ? { username: username.trim() } : {}),
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
// Auth is handled by requireAuth.
async function getUser(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid user id' })
  }

  if (req.user.id !== id) {
    return res
      .status(403)
      .json({ error: 'You can only view your own dashboard' })
  }

  const user = await users.findDashboardById(id)

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
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
