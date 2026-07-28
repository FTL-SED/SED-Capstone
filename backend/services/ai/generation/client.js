// Sends chat messages to the AI model and returns the reply parsed as JSON.
// The prompt (what we ask) lives in prompt.js; the client + its env/cert wiring
// live in lib/aiClient.js. This file only handles the network call, retries,
// and JSON parsing — no process.env access.
import { AI_TIMEOUT_MS, AI_MAX_RETRIES, AI_MAX_OUTPUT_TOKENS, AI_OPENAI_REASONING_EFFORT } from '../../../config/ai.js'
import { getAiClient } from '../../../lib/aiClient.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// The model sometimes wraps its JSON in a markdown code fence (```json ... ```).
// If it did, pull out just the JSON inside; otherwise return the text as-is.
export const stripCodeFence = (text) => {
  const match = text.match(/^\s*```(?:json)?\s*\n?([\s\S]*?)\n?\s*```\s*$/)
  return match ? match[1] : text
}

// Parse the model's reply into a JS object, tolerating the ways a chatty model
// wraps its JSON. Order: (1) strip a code fence and parse; (2) if that fails,
// the model likely prepended/appended prose ("Looking at the shortlist, here
// is... {json}") — slice from the first "{" to the last "}" and parse that.
// Throws if no JSON object can be recovered (caller turns it into the fallback).
export const extractJson = (text) => {
  const stripped = stripCodeFence(text)
  try {
    return JSON.parse(stripped)
  } catch {
    const start = stripped.indexOf('{')
    const end = stripped.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('AI reply contained no JSON object')
    }
    return JSON.parse(stripped.slice(start, end + 1))
  }
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
  const { client, model, provider } = getAiClient()
  const response = await client.chat.completions.create(
    {
      model,
      messages,
      // Cap generated tokens as a cost guardrail — one itinerary JSON is well
      // under this, but for a reasoning model (e.g. gpt-5) this also bounds the
      // billed reasoning tokens so a runaway generation can't drain the budget.
      // max_completion_tokens is the current param (max_tokens is deprecated and
      // rejected by reasoning models); the gateway accepts it too.
      max_completion_tokens: AI_MAX_OUTPUT_TOKENS,
      // reasoning_effort is an OpenAI-only param — send it ONLY on the OpenAI
      // path (the Salesforce gateway rejects unknown params). 'low' roughly
      // halves gpt-5's latency for this shallow sequencing task.
      ...(provider === 'openai' ? { reasoning_effort: AI_OPENAI_REASONING_EFFORT } : {}),
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
      return extractJson(reply)
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
