// Banner-generation service: turns itinerary details + a user's free-text style
// request into an image prompt, calls the image client, and returns base64.
// Thin per .claude/rules/backend.md — the controller stays free of prompt logic.
import { generateImage } from '../../../lib/imageClient.js'
import { BANNER_PROMPT_MAX_CHARS } from '../../../config/ai.js'

// A fixed scaffold that shapes every banner and forbids text overlays — image
// models render words poorly, and a cover with garbled text looks broken.
const STYLE_SCAFFOLD =
  'A wide, landscape travel banner image. Warm, inviting, high quality. ' +
  'Absolutely NO text, letters, words, numbers, logos, or watermarks anywhere in the image.'

// Compose the image prompt. Itinerary context is included only when present, so
// a bare wizard (no title/description yet) still produces a sensible banner. The
// user's style text is trimmed and length-capped to bound the request.
export function buildBannerPrompt({ title, location, description } = {}, promptText = '') {
  const parts = [STYLE_SCAFFOLD]

  const context = []
  if (title) context.push(`titled "${title}"`)
  if (location) context.push(`for a trip to ${location}`)
  if (description) context.push(`described as: ${description}`)
  if (context.length > 0) {
    parts.push(`The banner is ${context.join(', ')}.`)
  }

  const style = String(promptText ?? '').trim().slice(0, BANNER_PROMPT_MAX_CHARS)
  if (style) {
    parts.push(`Style direction from the user: ${style}.`)
  }

  return parts.join(' ')
}

// Build the prompt, generate one image, and return it as base64 + media type.
// imageFn is injectable so tests can run without the OpenAI SDK or a key.
export async function generateBanner(details, promptText, imageFn = generateImage) {
  const prompt = buildBannerPrompt(details, promptText)
  const { b64_json } = await imageFn({ prompt })
  if (!b64_json) throw new Error('Image API returned no image data')
  return { image: b64_json, mediaType: 'image/png' }
}
