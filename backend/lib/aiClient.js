// The AI model-gateway client + its env/cert wiring. This is the ONLY place the
// AI provider keys and certificate path are read from process.env (per
// .claude/rules/backend.md's "process.env confined to lib/" rule), mirroring
// lib/supabase.js. The sequencing service (services/ai/) imports getAiClient()
// and stays free of env access.
import fs from 'node:fs'
import https from 'node:https'
import OpenAI from 'openai'
import { AI_MODEL, AI_OPENAI_MODEL } from '../config/ai.js'

// The Salesforce internal gateway and OpenAI both speak the OpenAI
// chat-completions wire format, so the same SDK talks to either — only the base
// URL (OpenAI's is the SDK default, so we don't set one), model id, and TLS
// handling differ. We pick between them by which key is set: AI_KEY means the
// internal gateway, OPEN_AI_API_KEY means OpenAI directly.
const GATEWAY_BASE_URL =
  'https://eng-ai-model-gateway.sfproxy.devx-preprod.aws-esvc1-useast2.aws.sfdc.cl'

// Build the OpenAI client once, the first time it's actually needed — not at
// import time, so tests can import the service without a key or cert set.
// Returns { client, model }: the model id travels with the client so callers
// use the id that matches whichever provider we resolved.
let cached
export function getAiClient() {
  if (cached) return cached

  // Prefer the internal gateway (AI_KEY); fall back to OpenAI.
  if (process.env.AI_KEY) {
    if (!process.env.NODE_EXTRA_CA_CERTS) throw new Error('NODE_EXTRA_CA_CERTS is not set')
    cached = {
      model: AI_MODEL,
      client: new OpenAI({
        apiKey: process.env.AI_KEY,
        baseURL: GATEWAY_BASE_URL,
        // The internal endpoint uses Salesforce's certificate, which Node
        // doesn't trust by default, so we load it from NODE_EXTRA_CA_CERTS.
        httpAgent: new https.Agent({
          ca: fs.readFileSync(process.env.NODE_EXTRA_CA_CERTS),
        }),
      }),
    }
  } else if (process.env.OPEN_AI_API_KEY) {
    // OpenAI's default base URL + a public certificate Node already trusts, so
    // no baseURL override, no custom httpAgent, no NODE_EXTRA_CA_CERTS needed.
    cached = {
      model: AI_OPENAI_MODEL,
      client: new OpenAI({
        apiKey: process.env.OPEN_AI_API_KEY,
      }),
    }
  } else {
    throw new Error('AI_KEY (or OPEN_AI_API_KEY) is not set')
  }

  return cached
}
