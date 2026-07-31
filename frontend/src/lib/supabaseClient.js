import { createClient } from '@supabase/supabase-js'

// Browser Supabase client used ONLY for the auth handshake (Google sign-in and
// reading the session it returns). All application data still flows
// frontend -> backend -> Supabase per the project's architecture rule; this
// client never touches the database. OAuth is a browser redirect flow, so the
// login handshake is the one piece that has to run client-side.
//
// Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// createClient throws when the URL/key are missing, which would blank the whole
// app at import time — even the email/password login, which doesn't use
// Supabase. Guard so a missing config only disables Google sign-in: export null
// and let the auth helpers surface a clear error instead.
export const supabase = (url && anonKey)
  ? createClient(url, anonKey, {
      auth: {
        // Parse the access token from the URL fragment after Google redirects
        // back, so the returned session is captured without extra wiring.
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

if (!supabase) {
  console.error(
    'Supabase auth disabled: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env, then restart the dev server.'
  )
}
