// Shared authentication middleware, per .claude/rules/backend.md's Middleware
// section ("Authentication" is listed as functionality shared across routes).
// Every protected route uses this single extracted check — controllers read
// req.user rather than re-verifying the token themselves.
import supabase from '../lib/supabase.js'
import * as users from '../models/users.js'

// Reads the "Authorization: Bearer <token>" header and asks Supabase who the
// token belongs to. Returns the verified auth user, or null if not signed in.
async function getAuthUser(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null

  if (!token) return null

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null

  // OAuth providers (e.g. Google) put the profile picture in user_metadata as
  // `avatar_url` or `picture`. Surface it so first-login provisioning can save it.
  const meta = data.user.user_metadata || {}
  return {
    id: data.user.id,
    email: data.user.email,
    avatarUrl: meta.avatar_url || meta.picture || null,
  }
}

// Verifies the caller is signed in and resolves their app-side `User` row,
// attaching it to `req.user` for downstream handlers. Responds 401 and does
// NOT call `next()` when the caller isn't a usable, provisioned user.
async function requireAuth(req, res, next) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    return res.status(401).json({ error: 'You must be signed in' })
  }

  const profile = await users.findByAuthUserId(authUser.id)
  if (!profile) {
    return res.status(401).json({ error: 'You must be signed in' })
  }

  req.user = profile
  next()
}

export { requireAuth, getAuthUser }
