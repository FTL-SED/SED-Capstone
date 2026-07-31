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
