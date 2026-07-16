import { createClient } from '@supabase/supabase-js'

// Shared Supabase client used only to verify caller access tokens (auth),
// per .claude/rules/backend.md's "process.env access confined to lib/" rule.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Admin client for server-side Storage writes. Uses the service-role key, which
// bypasses Storage RLS — safe here because it never leaves the backend. Kept in
// lib/ so env access stays confined per the backend rules.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const AVATAR_BUCKET = 'avatars'

// Uploads an avatar image to the `avatars` bucket and returns its public URL.
// `path` is the object key (e.g. `123/avatar.png`); an existing object at the
// same key is overwritten so a user keeps a single avatar file.
async function uploadAvatar({ path, buffer, contentType }) {
  const { error } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(path, buffer, { contentType, upsert: true })

  if (error) throw error

  const { data } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export default supabase
export { uploadAvatar }
