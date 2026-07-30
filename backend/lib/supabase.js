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
const ITINERARY_COVER_BUCKET = 'itinerary-covers'

// Uploads an image to a Storage bucket and returns its public URL. `path` is the
// object key (e.g. `123/cover.png`); an existing object at the same key is
// overwritten (upsert) so each owner keeps a single file per resource.
async function uploadImage({ bucket, path, buffer, contentType }) {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true })

  if (error) throw error

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Uploads a user avatar to the `avatars` bucket. Thin wrapper over uploadImage.
async function uploadAvatar({ path, buffer, contentType }) {
  return uploadImage({ bucket: AVATAR_BUCKET, path, buffer, contentType })
}

// Uploads an itinerary cover to the `itinerary-covers` bucket.
async function uploadItineraryCoverImage({ path, buffer, contentType }) {
  return uploadImage({ bucket: ITINERARY_COVER_BUCKET, path, buffer, contentType })
}

// Removes an itinerary's cover object(s) from the `itinerary-covers` bucket.
// The upload keys the object by mimetype-derived extension (`${id}/cover.png`),
// so we list everything under the `${id}/` prefix and remove it rather than
// guessing the extension. No-op if the folder is already empty.
async function removeItineraryCoverImage(id) {
  const { data: objects, error: listError } = await supabaseAdmin.storage
    .from(ITINERARY_COVER_BUCKET)
    .list(String(id))

  if (listError) throw listError
  if (!objects?.length) return

  const paths = objects.map((obj) => `${id}/${obj.name}`)
  const { error: removeError } = await supabaseAdmin.storage
    .from(ITINERARY_COVER_BUCKET)
    .remove(paths)

  if (removeError) throw removeError
}

// Changes a user's password via the admin API. Used by the account page's
// password change, after the caller's current password has been re-verified.
// Kept in lib/ so service-role access stays confined here.
async function updateUserPassword(authUserId, password) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    password,
  })
  if (error) throw error
}

export default supabase
export { uploadAvatar, uploadItineraryCoverImage, removeItineraryCoverImage, updateUserPassword }
