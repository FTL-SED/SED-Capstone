// OpenAI image-generation client for AI banners. This is the ONLY place the
// image-generation key is read from process.env (per .claude/rules/backend.md's
// "process.env confined to lib/" rule), mirroring lib/aiClient.js. The banner
// service (services/ai/banner/) imports generateImage() and stays env-free.
import OpenAI from 'openai'
import { BANNER_MODEL, BANNER_IMAGE_SIZE, MODERATION_MODEL } from '../config/ai.js'

// Built once, lazily, so tests can import the service without a key set.
let cached
function getImageClient() {
  if (cached) return cached
  if (!process.env.OPEN_AI_API_KEY) {
    throw new Error('OPEN_AI_API_KEY is not set (required for banner generation)')
  }
  cached = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY })
  return cached
}

// Generate one image from a text prompt. Returns { b64_json }. gpt-image-1
// always returns base64 (no URL option), which is exactly what we want — the
// bytes travel to the browser and are never persisted server-side here.
export async function generateImage({ prompt, size = BANNER_IMAGE_SIZE }) {
  const client = getImageClient()
  const response = await client.images.generate({
    model: BANNER_MODEL,
    prompt,
    size,
    n: 1,
    // Keep gpt-image-1's own safety filter at its strict default (defense in
    // depth behind our input moderation). Set explicitly so it can't silently
    // drift to 'low'.
    moderation: 'auto',
  })
  const b64 = response?.data?.[0]?.b64_json
  if (!b64) throw new Error('Image API returned no image data')
  return { b64_json: b64 }
}

// Screen free text against OpenAI's moderation endpoint before we spend an image
// call. Returns { flagged }. The moderation API is free. Reuses the same lazy
// client so the key stays confined to this lib file. An empty/blank input is
// treated as not-flagged (nothing to screen); the caller decides fail-open vs
// fail-closed on errors — this just surfaces the verdict or throws.
export async function moderateText(input) {
  const text = typeof input === 'string' ? input.trim() : ''
  if (!text) return { flagged: false }
  const client = getImageClient()
  const response = await client.moderations.create({
    model: MODERATION_MODEL,
    input: text,
  })
  const flagged = Boolean(response?.results?.some((r) => r.flagged))
  return { flagged }
}
