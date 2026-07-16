// Talks to Salesforce's internal AI model gateway using the OpenAI SDK.
// One job: send chat messages, get back the model's reply parsed as JSON.
// The prompt (what we ask) lives in prompt.js; this file only handles the
// network call, retries, and JSON parsing.
import fs from 'node:fs'
import https from 'node:https'
import OpenAI from 'openai'
import { AI_MODEL, AI_TIMEOUT_MS, AI_MAX_RETRIES } from '../../../config/ai.js'

const BASE_URL =
  'https://eng-ai-model-gateway.sfproxy.devx-preprod.aws-esvc1-useast2.aws.sfdc.cl'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Build the OpenAI client once, the first time we actually need it. We don't
// build it at import time so tests can import this file without needing the
// API key or certificate set.
let client
const getClient = () => {
  if (!client) {
    if (!process.env.AI_KEY) throw new Error('AI_KEY is not set')
    if (!process.env.NODE_EXTRA_CA_CERTS) throw new Error('NODE_EXTRA_CA_CERTS is not set')

    client = new OpenAI({
      apiKey: process.env.AI_KEY,
      baseURL: BASE_URL,
      // The internal endpoint uses Salesforce's certificate, which Node doesn't
      // trust by default, so we load it from the NODE_EXTRA_CA_CERTS file.
      httpAgent: new https.Agent({
        ca: fs.readFileSync(process.env.NODE_EXTRA_CA_CERTS),
      }),
    })
  }
  return client
}

// The model sometimes wraps its JSON in a markdown code fence (```json ... ```).
// If it did, pull out just the JSON inside; otherwise return the text as-is.
const stripCodeFence = (text) => {
  const match = text.match(/^\s*```(?:json)?\s*\n?([\s\S]*?)\n?\s*```\s*$/)
  return match ? match[1] : text
}

// Some errors are worth retrying (the server was briefly busy or the network
// hiccuped); others aren't (a bad key or bad request will fail the same way
// every time). SDK errors carry an HTTP status: 5xx = server's fault (retry),
// 4xx = our fault (don't). A network/timeout error has no status, so retry it.
const worthRetrying = (err) => {
  const status = err?.status
  return typeof status !== 'number' || status >= 500
}

// Send the messages to the model and return the reply text. `messages` is the
// array of chat messages built by prompt.js.
const requestOnce = async (messages) => {
  const response = await getClient().chat.completions.create(
    {
      model: AI_MODEL,
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
// fallback.
const callAI = async (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('callAI requires a non-empty messages array')
  }

  let lastError
  for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt++) {
    try {
      const reply = await requestOnce(messages)
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
