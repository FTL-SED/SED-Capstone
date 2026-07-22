// Sends chat messages to the AI model and returns the reply parsed as JSON.
// The prompt (what we ask) lives in prompt.js; the client + its env/cert wiring
// live in lib/aiClient.js. This file only handles the network call, retries,
// and JSON parsing — no process.env access.
import { AI_TIMEOUT_MS, AI_MAX_RETRIES } from '../../../config/ai.js'
import { getAiClient } from '../../../lib/aiClient.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// The model sometimes wraps its JSON in a markdown code fence (```json ... ```).
// If it did, pull out just the JSON inside; otherwise return the text as-is.
export const stripCodeFence = (text) => {
  const match = text.match(/^\s*```(?:json)?\s*\n?([\s\S]*?)\n?\s*```\s*$/)
  return match ? match[1] : text
}

// Some errors are worth retrying (the server was briefly busy or the network
// hiccuped); others aren't (a bad key or bad request will fail the same way
// every time). SDK errors carry an HTTP status: 5xx = server's fault (retry),
// 4xx = our fault (don't). A network/timeout error has no status, so retry it.
export const worthRetrying = (err) => {
  const status = err?.status
  return typeof status !== 'number' || status >= 500
}

// Send the messages to the model and return the reply text. `messages` is the
// array of chat messages built by prompt.js.
const requestOnce = async (messages) => {
  const { client, model } = getAiClient()
  const response = await client.chat.completions.create(
    {
      model,
      messages,
      // No response_format: forcing JSON mode makes this gateway's model return
      // an empty {}. We ask for JSON in the prompt instead, then parse it here.
    },
    { timeout: AI_TIMEOUT_MS },
  )
  return response?.choices?.[0]?.message?.content
}

// Ask the AI to sequence an itinerary and return its reply parsed into a JS
// object. Retries a few times on transient errors, then gives up by throwing —
// the caller (generateItinerary) turns any throw into the deterministic
// fallback. `request` is injectable so tests can exercise the retry/parse logic
// without a live model; it defaults to the real network call.
const callAI = async (messages, request = requestOnce) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('callAI requires a non-empty messages array')
  }

  let lastError
  for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
    try {
      const reply = await request(messages)
      if (typeof reply !== 'string') throw new Error('AI response had no message content')
      return JSON.parse(stripCodeFence(reply))
    } catch (err) {
      lastError = err
      if (!worthRetrying(err)) break
      // Wait a little longer before each retry (but not after the last try).
      if (attempt < AI_MAX_RETRIES) await sleep(250 * (attempt + 1))
    }
  }

  throw lastError
}

export { callAI }
