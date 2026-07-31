// OpenAI image-generation client for AI banners. This is the ONLY place the
// image-generation key is read from process.env (per .claude/rules/backend.md's
// "process.env confined to lib/" rule), mirroring lib/aiClient.js. The banner
// service (services/ai/banner/) imports generateImage() and stays env-free.
import OpenAI from 'openai'
import { BANNER_MODEL, BANNER_IMAGE_SIZE } from '../config/ai.js'

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
  })
  const b64 = response?.data?.[0]?.b64_json
  if (!b64) throw new Error('Image API returned no image data')
  return { b64_json: b64 }
}
