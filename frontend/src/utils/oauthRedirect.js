// Detect whether the current page load is a return from an OAuth provider
// (e.g. Google), by looking for the tokens the provider appends to the URL.
// Pure and dependency-free so it can be unit-tested and called with captured
// URL parts.
//
// Why this matters: the Supabase client persists the session, and
// `detectSessionInUrl` also strips these params from the URL shortly after
// load. So "a session exists" is NOT the same as "the user just came back from
// a redirect" — a lingering session (e.g. after logout) would otherwise trigger
// an unwanted auto-sign-in on a plain /login visit. Capture this at module load
// from the raw URL before Supabase cleans it, and gate sign-in completion on it.
//
// PKCE flow lands with `?code=...` in the query string; the implicit flow lands
// with `#access_token=...` in the hash. Accept either. Leading `?`/`#` optional.
export function isOAuthRedirect(search, hash) {
  const query = new URLSearchParams(String(search ?? '').replace(/^\?/, ''))
  if (query.has('code')) return true

  const fragment = new URLSearchParams(String(hash ?? '').replace(/^#/, ''))
  return fragment.has('access_token')
}
