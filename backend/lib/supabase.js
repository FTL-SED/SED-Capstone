const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

let supabase

if (!supabaseUrl || !supabaseAnonKey) {
  // Let the server boot without Supabase configured (e.g. before the project
  // URL exists). Auth-protected routes will return 401 until it's set up.
  console.warn(
    'Supabase is not configured: set SUPABASE_URL and SUPABASE_ANON_KEY in backend/.env. Auth-protected routes will return 401 until configured.'
  )
  supabase = {
    auth: {
      async getUser() {
        return { data: null, error: new Error('Supabase not configured') }
      },
    },
  }
} else {
  // The server uses this client only to verify a caller's access token
  // (supabase.auth.getUser(token)). Sign-up, login, and password management all
  // happen on the client against Supabase Auth directly.
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

module.exports = supabase
