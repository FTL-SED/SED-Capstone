import api from './client.js'

// User/account API calls. All go through the shared `api` client so the auth
// token is attached automatically and a 401 triggers the session-clear +
// /login redirect in client.js — behavior these calls previously skipped by
// using raw axios with hand-built headers.

// Update the caller's own profile (currently just username). Returns the
// updated profile fields.
export async function updateUsername(id, username) {
  const { data } = await api.put(`/users/${id}`, { username })
  return data
}

// Change the caller's password via the app's Supabase-backed endpoint.
export async function changePassword(id, currentPassword, newPassword) {
  const { data } = await api.post(`/users/${id}/password`, { currentPassword, newPassword })
  return data
}

// Upload a new avatar image. `formData` is a FormData with an "avatar" file;
// axios sets the multipart Content-Type (and boundary) automatically.
export async function uploadAvatar(id, formData) {
  const { data } = await api.post(`/users/${id}/avatar`, formData)
  return data
}

// Create the account (Supabase auth user + app profile). Public endpoint — no
// token needed. Returns { user, session }. Called at the END of onboarding so an
// abandoned wizard leaves no account behind.
export async function register({ email, password, username }) {
  const { data } = await api.post('/users/register', { email, password, username })
  return data
}

// Public pre-check for the register form: is this email / username already
// taken? Lets the multi-step flow block on Continue instead of failing at the
// end of onboarding. Returns { emailTaken, usernameTaken }.
export async function checkAvailability({ email, username }) {
  const { data } = await api.get('/users/availability', { params: { email, username } })
  return data
}

// Fetch the caller's own saved preferences (incl. isPublic) for the profile
// editor. Returns the backend preferences record.
export async function getPreferences(id) {
  const { data } = await api.get(`/users/${id}/preferences`)
  return data
}

// Persist any subset of the caller's saved preferences (incl. isPublic). During
// onboarding the token isn't in localStorage yet (the app stays locked until the
// wizard finishes), so callers can pass `accessToken` to authorize this one call
// explicitly; otherwise the shared client attaches the stored token.
export async function updatePreferences(id, body, accessToken) {
  const config = accessToken
    ? { headers: { Authorization: `Bearer ${accessToken}` } }
    : undefined
  const { data } = await api.put(`/users/${id}/preferences`, body, config)
  return data
}

// Search PUBLIC users by username substring (for "add group member by
// username"). Returns { users: [...] } where each user carries a prefs snapshot.
export async function searchUsers(username) {
  const { data } = await api.get('/users/search', { params: { username } })
  return data.users
}
