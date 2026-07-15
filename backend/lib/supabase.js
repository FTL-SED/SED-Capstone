import { createClient } from '@supabase/supabase-js'

// Shared Supabase client used only to verify caller access tokens (auth),
// per .claude/rules/backend.md's "process.env access confined to lib/" rule.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default supabase
