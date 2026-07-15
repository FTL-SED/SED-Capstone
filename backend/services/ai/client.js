// Step 2 — thin OpenRouter client. Makes one structured-JSON chat call and
// returns the parsed object. No prompt logic lives here (that's the service
// layer); this file only knows how to talk to OpenRouter reliably.
import { AI_MODEL, AI_TIMEOUT_MS, AI_MAX_RETRIES } from '../../config/ai.js'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Transient failures worth retrying: any 5xx, or a network/timeout error
// (which we surface as status 0). A clean 4xx is our fault (bad key, bad
// request) and never retried.
const isTransient = (status) => status === 0 || status >= 500

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// One HTTP attempt. Resolves { status, body } on any HTTP response; throws
// only on network failure/timeout (caught by the retry loop as status 0).
async function attempt({ messages, temperature, maxTokens }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        // json_object mode: the model must return syntactically valid JSON.
        // Shape is enforced downstream by validation (Step 4), not the API.
        response_format: { type: 'json_object' },
        ...(temperature != null ? { temperature } : {}),
        ...(maxTokens != null ? { max_tokens: maxTokens } : {}),
      }),
      signal: controller.signal,
    })
    return { status: res.status, body: await res.json().catch(() => null) }
  } finally {
    clearTimeout(timer)
  }
}

// Pull the assistant's message content out of OpenRouter's response and parse
// it as JSON. Throws if the content is missing or isn't valid JSON.
function parseContent(body) {
  const content = body?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('OpenRouter response missing message content')
  }
  try {
    return JSON.parse(content)
  } catch {
    throw new Error('OpenRouter returned malformed JSON')
  }
}

// Make a structured JSON call to OpenRouter.
//   messages     = OpenRouter chat messages (system + user); built by the
//                  service layer, never here.
//   temperature? = sampling temperature (defaults to the model's own).
//   maxTokens?   = optional output cap.
// Returns the parsed JSON object on success. Throws on timeout, 4xx/5xx, or
// malformed JSON — the caller (generateItinerary) turns a throw into the
// deterministic fallback.
async function callOpenRouter({ messages, temperature, maxTokens } = {}) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set')
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('callOpenRouter requires a non-empty messages array')
  }

  let lastError
  for (let tries = 0; tries <= AI_MAX_RETRIES; tries++) {
    let status = 0
    let body = null
    try {
      ;({ status, body } = await attempt({ messages, temperature, maxTokens }))
    } catch (err) {
      // Network failure or aborted timeout — treat as transient (status 0).
      lastError = err
    }

    if (status >= 200 && status < 300) {
      return parseContent(body)
    }

    lastError =
      lastError ??
      new Error(`OpenRouter request failed with status ${status}`)

    // Give up immediately on a non-transient (4xx) response.
    if (status !== 0 && !isTransient(status)) break

    // Backoff before the next retry (skip the wait after the final attempt).
    if (tries < AI_MAX_RETRIES) await sleep(250 * (tries + 1))
  }

  throw lastError
}

export { callOpenRouter }
