import { supabase } from '../lib/supabaseClient.js'
import api from './client.js'

// Auth handshake helpers. Sign-in itself runs against Supabase in the browser
// (OAuth is a redirect flow); provisioning the app-side profile goes through
// the backend, keeping data access on the server per the architecture rule.

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
// `User` row. Returns { user, accessToken, expiresAt } or null when there's no
// pending OAuth session (i.e. a normal page load, not a return from Google).
export async function completeOAuthSignIn() {
  if (!supabase) return null
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

// True when a Supabase session exists on the current page — i.e. the recovery
// link was followed and detectSessionInUrl captured the session. Used by the
// reset page to decide whether to show the form or an "invalid link" message.
export async function hasRecoverySession() {
  if (!supabase) return false
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

// Set the new password using the recovery session, then sign out so the user
// isn't left in a lingering recovery session — they log in fresh afterward.
export async function updatePassword(newPassword) {
  if (!supabase) throw new Error('Password reset is not configured')
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  await supabase.auth.signOut()
}
