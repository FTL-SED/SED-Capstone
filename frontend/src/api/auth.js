import { supabase } from '../lib/supabaseClient.js'
import api from './client.js'
import { isOAuthRedirect } from '../utils/oauthRedirect.js'

// Auth handshake helpers. Sign-in itself runs against Supabase in the browser
// (OAuth is a redirect flow); provisioning the app-side profile goes through
// the backend, keeping data access on the server per the architecture rule.

// Capture whether THIS page load is a return from the Google redirect, read at
// module load — before Supabase's detectSessionInUrl strips the tokens from the
// URL. This is the signal that the user just authenticated, as opposed to a
// persisted session that merely lingers in storage (e.g. after logout). One-
// shot: consumed by the first completeOAuthSignIn call so a later re-mount of
// the login page can't replay it.
let pendingOAuthReturn =
  typeof window !== 'undefined' &&
  isOAuthRedirect(window.location.search, window.location.hash)

// Kick off Google sign-in. Redirects the browser to Google's consent screen,
// then back to the app, where supabaseClient captures the session from the URL.
export async function signInWithGoogle() {
  if (!supabase) throw new Error('Google sign-in is not configured')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/login` },
  })
  if (error) throw error
}

// After the OAuth redirect returns, exchange the Supabase session for our
// app-side profile: the backend verifies the token and find-or-creates the
// `User` row. Returns { user, accessToken, expiresAt }, or null when this page
// load is NOT a fresh return from Google. Gating on pendingOAuthReturn (not just
// on getSession) is what stops a lingering persisted session from auto-signing
// the user in on a normal /login visit after logout.
export async function completeOAuthSignIn() {
  if (!supabase) return null
  // Only proceed when THIS page load was a Google return, not a plain /login
  // visit with a lingering persisted session. The flag is reset on logout (see
  // signOutSupabase), so it is NOT consumed here — consuming it would let
  // React StrictMode's double-invoked effect starve the live second run (its
  // first, cancelled run would eat the flag), leaving a real return stuck on
  // /login. Re-running the (idempotent, find-or-create) provisioning is safe.
  if (!pendingOAuthReturn) return null

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  // The interceptor in client.js reads "accessToken" from localStorage, which
  // isn't set yet during this first call, so send the token explicitly.
  const { data } = await api.post('/users/oauth', null, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  return {
    user: data.user,
    accessToken: session.access_token,
    expiresAt: session.expires_at * 1000,
  }
}

// Send a password-reset email. Supabase mails a recovery link that lands on
// /reset-password, where the recovery session is captured and the new password
// is set. Callers should show the same neutral message regardless of outcome
// (anti-enumeration) and only surface an error on a real client failure.
export async function sendPasswordReset(email) {
  if (!supabase) throw new Error('Password reset is not configured')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

// Password-recovery detection. Supabase fires an 'PASSWORD_RECOVERY' auth event
// when detectSessionInUrl processes a recovery link — this is what distinguishes
// a genuine reset flow from a plain persisted session (e.g. a logged-in or
// recently-logged-out Google user), which a bare getSession() check could not.
//
// The event can fire during client init (at module import) BEFORE the reset page
// mounts and subscribes, so a pure listener would miss it. We register the
// listener here at module load — earlier than any component mount — and latch a
// flag when it fires, so a subscriber that attaches late still hears about it.
let recoveryDetected = false
const recoveryListeners = new Set()

if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryDetected = true
      for (const listener of recoveryListeners) listener()
    }
  })
}

// Subscribe to the password-recovery event. Invokes `callback` when a genuine
// recovery context is active — immediately if it already fired before this call
// (the init-time race), otherwise when it fires. Returns an unsubscribe function.
// Deliberately NOT satisfied by a plain non-recovery session.
export function onPasswordRecovery(callback) {
  if (!supabase) return () => {}
  if (recoveryDetected) {
    callback()
    return () => {}
  }
  recoveryListeners.add(callback)
  return () => recoveryListeners.delete(callback)
}

// Clear any persisted Supabase session on logout. Google sign-in persists a
// session and the app's own logout only clears localStorage, leaving a residual
// Supabase session that could satisfy updateUser without a fresh emailed link.
// Sign out to close that gap. Guarded on the null client like the other helpers.
export async function signOutSupabase() {
  // Clear the OAuth-return flag so a later /login mount in the same SPA session
  // (no page reload) can't replay the sign-in — this, not one-shot consumption,
  // is what prevents "logout then auto-login".
  pendingOAuthReturn = false
  if (!supabase) return
  await supabase.auth.signOut()
}

// Set the new password using the recovery session, then sign out so the user
// isn't left in a lingering recovery session — they log in fresh afterward.
export async function updatePassword(newPassword) {
  if (!supabase) throw new Error('Password reset is not configured')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  await supabase.auth.signOut()
}
