import supabase, { uploadAvatar, updateUserPassword } from '../lib/supabase.js'
import * as users from '../models/users.js'
import { reshapeItinerary } from '../models/itineraries.js'
import { parseIdParam } from './helpers.js'
import { getAuthUser } from '../middleware/auth.js'
import { usernameFromEmail } from '../utils/username.js'
import { detectImageType } from '../utils/imageType.js'

// Real image types we accept, mapped to the stored extension + Content-Type.
// Derived from the file's magic bytes (detectImageType), never the spoofable
// client-supplied mimetype.
const IMAGE_CONTENT_TYPE = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }

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
    if (await users.findByUsername(username.trim())) {
      return res
        .status(409)
        .json({ error: 'That username is already taken. Please pick another.' })
    }

    if (await users.findByEmail(email)) {
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

  // A valid Supabase account with no matching app-side profile isn't a usable
  // login (e.g. the User row was removed). Treat it as unauthenticated rather
  // than returning a null user the client can't act on.
  if (!profile) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  return res.status(200).json({ user: profile, session: data.session })
}

// POST /users/oauth
// Provisions the app-side profile for a user who signed in via an OAuth provider
// (e.g. Google). The frontend completes the Supabase OAuth handshake in the
// browser, then sends the resulting access token here. We verify the token,
// then find-or-create the matching `User` row (OAuth gives us an email but no
// username, so we derive a unique one). Returns the profile the same shape as
// login. Cannot use requireAuth — that rejects tokens with no profile yet,
// which is exactly the case we're here to create.
async function provisionOAuthUser(req, res) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return res.status(401).json({ error: 'You must be signed in' })
  }

  try {
    // Already provisioned (a returning Google user) — just return the profile.
    const existing = await users.findByAuthUserId(authUser.id)
    if (existing) {
      return res.status(200).json({ user: existing })
    }

    // First OAuth login for this account: derive a unique username from the
    // email and create the profile. The email is trusted because it comes from
    // the Supabase-verified token, not the request body.
    const base = usernameFromEmail(authUser.email)
    const username = await users.findAvailableUsername(base)

    const user = await users.create({
      authUserId: authUser.id,
      email: authUser.email,
      username,
      // Google gives us a profile picture on first login — save it. Falls back
      // to the default avatar (null) for providers/accounts without one.
      avatarUrl: authUser.avatarUrl,
    })

    return res.status(201).json({ user })
  } catch (err) {
    // Safety net for the race where two concurrent first-logins collide on the
    // unique constraint — the loser re-reads the now-created row.
    if (err.code === 'P2002') {
      const existing = await users.findByAuthUserId(authUser.id)
      if (existing) return res.status(200).json({ user: existing })
    }
    console.error('provisionOAuthUser error:', err)
    return res
      .status(500)
      .json({ error: 'Something went wrong on our end. Please try again.' })
  }
}

// PUT /users/:id
// Updates the caller's own profile. Only `username` is editable here; email and
// password are managed by Supabase Auth. Auth is handled by requireAuth.
async function updateUser(req, res) {
  const id = parseIdParam(req, res, 'user id')
  if (id === null) return

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

// Coerce an inbound tag array into a clean list of trimmed, non-empty, unique
// strings, or return null if it isn't an array of strings. Caps the count so a
// client can't store an unbounded list. Validates shape, not vocab membership:
// the app treats unknown tags permissively, and the wizard's tags aren't vocab-
// checked either (see frontend buildRequest.js).
function cleanTagList(value, cap = 40) {
  if (!Array.isArray(value)) return null
  const out = []
  for (const t of value) {
    if (typeof t !== 'string') return null
    const trimmed = t.trim()
    if (trimmed && !out.includes(trimmed)) out.push(trimmed)
  }
  return out.slice(0, cap)
}

// GET /users/search?username=<query>
// Case-insensitive username-substring search over PUBLIC users, plus the caller
// themselves even if their own profile is private (you can always add yourself
// to your own trip). Returns each match's public preference snapshot so the
// itinerary wizard can pre-fill a group member. Auth is handled by requireAuth.
async function searchUsers(req, res) {
  const query = typeof req.query.username === 'string' ? req.query.username.trim() : ''

  // Require at least 1 character — an empty query would return an arbitrary
  // slice of the user table. (The model caps results at 10, so even a common
  // single letter stays bounded.)
  if (query.length < 1) {
    return res.status(400).json({ error: 'Enter at least 1 character to search.' })
  }

  const results = await users.searchPublicByUsername(query, { includeSelfId: req.user.id })
  return res.status(200).json({ users: results })
}

// GET /users/availability?email=<email>&username=<username>
// Public pre-check for the registration form: reports whether an email and/or
// username are already taken, so the multi-step register flow can block up front
// instead of letting the user finish onboarding and fail at account creation.
// Only checks the fields provided. Note: this is a best-effort UX check — the
// real uniqueness guarantee is still the DB constraint enforced in registerUser
// (two people could pass this check simultaneously; the P2002 catch handles it).
async function checkAvailability(req, res) {
  const email = typeof req.query.email === 'string' ? req.query.email.trim() : ''
  const username = typeof req.query.username === 'string' ? req.query.username.trim() : ''

  if (!email && !username) {
    return res.status(400).json({ error: 'Provide an email and/or username to check.' })
  }

  const [emailRow, usernameRow] = await Promise.all([
    email ? users.findByEmail(email) : null,
    username ? users.findByUsername(username) : null,
  ])

  return res.status(200).json({
    emailTaken: !!emailRow,
    usernameTaken: !!usernameRow,
  })
}

// GET /users/:id/preferences
// Returns the caller's own saved preferences (incl. isPublic) for the profile
// page / preferences editor. Owner-only. Auth is handled by requireAuth.
async function getPreferences(req, res) {
  const id = parseIdParam(req, res, 'user id')
  if (id === null) return

  if (req.user.id !== id) {
    return res.status(403).json({ error: 'You can only view your own preferences' })
  }

  const prefs = await users.findPreferencesById(id)
  if (!prefs) {
    return res.status(404).json({ error: 'User not found' })
  }

  return res.status(200).json(prefs)
}

// PUT /users/:id/preferences
// Persists any subset of the caller's saved preferences: isPublic (privacy
// toggle), interestTags, foodPrefs, diets, and the default start location. Each
// field is optional so the same endpoint serves both the privacy toggle (just
// isPublic) and the full preferences editor. Owner-only; auth via requireAuth.
async function updatePreferences(req, res) {
  const id = parseIdParam(req, res, 'user id')
  if (id === null) return

  if (req.user.id !== id) {
    return res.status(403).json({ error: 'You can only edit your own preferences' })
  }

  const { isPublic, interestTags, foodPrefs, diets, defaultStartLocation } = req.body
  const data = {}

  if (isPublic !== undefined) {
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ error: 'isPublic must be a boolean' })
    }
    data.isPublic = isPublic
  }

  for (const [key, value] of [
    ['interestTags', interestTags],
    ['foodPrefs', foodPrefs],
    ['diets', diets],
  ]) {
    if (value !== undefined) {
      const cleaned = cleanTagList(value)
      if (cleaned === null) {
        return res.status(400).json({ error: `${key} must be an array of strings` })
      }
      data[key] = cleaned
    }
  }

  // Default start location: a resolved { label, latitude, longitude } from the
  // address picker, or null to clear it. Label + coords move together so a
  // snapshot into a group member always has usable coordinates.
  if (defaultStartLocation !== undefined) {
    if (defaultStartLocation === null) {
      data.defaultStartLabel = null
      data.defaultStartLat = null
      data.defaultStartLng = null
    } else {
      const { label, latitude, longitude } = defaultStartLocation
      const validLabel = typeof label === 'string' && label.trim() !== ''
      const validCoords = typeof latitude === 'number' && typeof longitude === 'number'
      if (!validLabel || !validCoords) {
        return res.status(400).json({
          error: 'defaultStartLocation must be { label, latitude, longitude } or null',
        })
      }
      data.defaultStartLabel = label.trim()
      data.defaultStartLat = latitude
      data.defaultStartLng = longitude
    }
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No preference fields provided' })
  }

  const updated = await users.updatePreferences(id, data)
  return res.status(200).json(updated)
}

// POST /users/:id/avatar
// Uploads the caller's avatar image to Supabase Storage and saves its public
// URL on the profile. Multipart body; the file is on `req.file` (multer). A
// user may only change their own avatar. Auth is handled by requireAuth.
async function uploadUserAvatar(req, res) {
  const id = parseIdParam(req, res, 'user id')
  if (id === null) return

  if (req.user.id !== id) {
    return res.status(403).json({ error: 'You can only edit your own profile' })
  }

  const file = req.file
  if (!file) {
    return res.status(400).json({ error: 'No image file provided' })
  }
  // Verify the actual bytes are a real image — the client-supplied mimetype is
  // spoofable, so it's never trusted for the accept decision or the stored name.
  const imageType = detectImageType(file.buffer)
  if (!imageType) {
    return res.status(400).json({ error: 'Avatar must be a PNG, JPEG, or WebP image' })
  }

  try {
    // One object per user, keyed by id — upsert overwrites the old avatar. The
    // extension keeps the content type honest; the query string busts the CDN
    // cache so the new image shows immediately.
    const publicUrl = await uploadAvatar({
      path: `${id}/avatar.${imageType}`,
      buffer: file.buffer,
      contentType: IMAGE_CONTENT_TYPE[imageType],
    })
    const avatarUrl = `${publicUrl}?v=${id}-${file.size}`

    const updated = await users.update(id, { avatarUrl })
    return res.status(200).json(updated)
  } catch (err) {
    console.error('uploadUserAvatar error:', err)
    return res
      .status(500)
      .json({ error: 'Could not upload your avatar. Please try again.' })
  }
}

// GET /users/:id
// Returns the owner's private dashboard data. A user may only fetch their own
// record, so email and the saved/liked lists are never exposed for another id.
// Auth is handled by requireAuth.
async function getUser(req, res) {
  const id = parseIdParam(req, res, 'user id')
  if (id === null) return

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
    // Created itineraries are the user's own → owner view. Bookmarked/liked are
    // OTHER people's public itineraries → strip owner-only fields (members,
    // meeting point) so the dashboard never exposes another group's data.
    createdItineraries: user.createdItineraries.map((it) => reshapeItinerary(it, { forOwner: true })),
    bookmarkedItineraries: user.bookmarks.map((b) => reshapeItinerary(b.itinerary, { forOwner: false })),
    likedItineraries: user.likes.map((l) => reshapeItinerary(l.itinerary, { forOwner: false })),
    // Visited itineraries are other people's public itineraries → forOwner:false
    // strips owner-only fields (members, meeting point), same as liked/bookmarked.
    visitedItineraries: user.visited.map((v) => reshapeItinerary(v.itinerary, { forOwner: false })),
  })
}

// POST /users/:id/password
// Changes the caller's own password. Requires the current password and
// re-verifies it (via Supabase sign-in) before updating, so a hijacked session
// can't silently reset the password. Auth is handled by requireAuth.
async function changeUserPassword(req, res) {
  const id = parseIdParam(req, res, 'user id')
  if (id === null) return

  if (req.user.id !== id) {
    return res.status(403).json({ error: 'You can only change your own password' })
  }

  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: 'Current and new password are required.' })
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res
      .status(400)
      .json({ error: 'New password must be at least 8 characters.' })
  }

  // Re-verify the current password: sign in with it before allowing a change.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: req.user.email,
    password: currentPassword,
  })
  if (verifyError) {
    return res.status(401).json({ error: 'Current password is incorrect.' })
  }

  try {
    await updateUserPassword(req.user.authUserId, newPassword)
    return res.status(200).json({ message: 'Password updated.' })
  } catch (err) {
    // Surface the raw error for us; send the user a friendly message.
    console.error('changeUserPassword error:', err.code, err.message)

    if (err.code === 'weak_password') {
      return res.status(400).json({
        error: 'Password must be 8+ characters and include a-z, A-Z, 0-9, and a special character.',
      })
    }
    return res
      .status(500)
      .json({ error: 'Could not update your password. Please try again.' })
  }
}

export {
  registerUser,
  loginUser,
  provisionOAuthUser,
  updateUser,
  getUser,
  uploadUserAvatar,
  changeUserPassword,
  searchUsers,
  checkAvailability,
  getPreferences,
  updatePreferences,
}
