// Derive a starting username from an email address, for accounts created via
// OAuth (e.g. Google) where the provider gives us an email but no username of
// our own. Pure and dependency-free — uniqueness is enforced separately by the
// caller against the User table.
//
// Takes the local-part (before "@"), lowercases it, strips anything that isn't
// a-z/0-9/._-, collapses repeats, and trims stray separators. Falls back to
// "user" when nothing usable remains (e.g. an all-symbol local-part).
export function usernameFromEmail(email) {
  const localPart = String(email ?? '').split('@')[0]
  const cleaned = localPart
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/[._-]{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '')

  return cleaned || 'user'
}
