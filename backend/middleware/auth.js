const supabase = require('../lib/supabase')

// Verifies the Supabase Auth access token sent as `Authorization: Bearer <token>`.
// On success, attaches the verified Supabase user to req.authUser so downstream
// handlers can trust the caller's identity without reading it from the body.
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null

  if (!token) {
    return res
      .status(401)
      .json({ error: 'Missing or malformed Authorization header' })
  }

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }

  req.authUser = {
    id: data.user.id,
    email: data.user.email,
  }

  next()
}

module.exports = requireAuth
