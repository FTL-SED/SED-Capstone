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
