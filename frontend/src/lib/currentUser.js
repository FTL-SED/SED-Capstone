// The signed-in user, read from localStorage. Guarded: a malformed/corrupt
// value returns null instead of throwing on JSON.parse (which would crash the
// page that reads it during render). Single source so every caller parses it
// the same safe way.
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser'))
  } catch {
    return null
  }
}
