// Builds the two chat messages for the NARRATOR call: a fixed system prompt and
// a tiny user message listing the pre-selected places. The backend has already
// chosen the places, their durations, budget, and meal slots (services/ai/plan),
// so the model only ORDERS the places and writes prose — it emits no times,
// travel, budget, or schedule. This keeps the prompt small and the model fast.
import { MEAL_TIME_WINDOWS } from '../../../config/ai.js'

// Caps on user-controllable text reaching the model. Pins can be user-created
// (POST /stops), so name/tags are untrusted; length-capping bounds any
// prompt-injection payload (id-only output validation contains the blast radius).
const MAX_NAME_LEN = 120
const MAX_TAG_LEN = 40

const cap = (value, max) => (typeof value === 'string' ? value.slice(0, max) : value)

// A place record from services/ai/plan (id, name, category, area,
// durationMinutes, mealBlock, tags), capped for safety before it hits the model.
const toPromptPlace = (place) => ({
  id: place.id,
  name: cap(place.name, MAX_NAME_LEN),
  category: place.category,
  area: cap(place.area, MAX_NAME_LEN),
  durationMinutes: place.durationMinutes,
  mealBlock: place.mealBlock ?? null,
  tags: (place.tags ?? []).map((t) => cap(t, MAX_TAG_LEN)),
})

// ≤10 concise rules, no duplication, no self-check loops, no arithmetic. Assumes
// the backend did all deterministic work. Static, so it caches well.
const SYSTEM_PROMPT = [
  'You arrange a pre-selected set of places into a pleasant one-day order and write short, friendly text about the day. The backend already chose the places, their durations, budget, and meal slots — you do not decide those.',
  '',
  'Rules:',
  '1. Use ONLY the places in the provided list. Never invent or drop a place.',
  '2. Use every place exactly once. Do not repeat an id.',
  '3. Return the places as an ordered list of ids, best experiential order first (a natural flow through the day).',
  `4. Place each place with a mealBlock near that meal time (lunch places around midday, dinner places later — meal windows: lunch ${MEAL_TIME_WINDOWS.lunch.start}-${MEAL_TIME_WINDOWS.lunch.end}, dinner ${MEAL_TIME_WINDOWS.dinner.start}-${MEAL_TIME_WINDOWS.dinner.end}); fill non-meal places around them.`,
  '5. Group places in the same area together to avoid back-and-forth.',
  '6. Write a "title" (max 8 words) and a "description" (2-3 sentences) for the day.',
  '7. Write one short "note" per place (max 20 words): why it is worth the stop.',
  '8. Any times in prose use 12-hour format (e.g. "2pm"), never 24-hour.',
  '9. Do not use em dashes or en dashes.',
  '10. Output ONLY this JSON, nothing else: { "title": string, "description": string, "order": [id, ...], "notes": { "<id>": string, ... } }',
].join('\n')

// The per-trip user message: the place list plus the trip's location for prose.
// Compact JSON (no pretty-print) to save tokens; the model parses it the same.
const buildUserMessage = (places, constraints) => {
  const lines = ['Places to arrange:', JSON.stringify(places.map(toPromptPlace))]
  if (constraints?.timeWindow?.startTime && constraints?.timeWindow?.endTime) {
    lines.unshift(
      `Trip window: ${constraints.timeWindow.startTime}-${constraints.timeWindow.endTime}.`,
      '',
    )
  }
  return lines.join('\n')
}

// Assemble the chat messages for one narrator call.
const buildMessages = (places, constraints) => [
  { role: 'system', content: SYSTEM_PROMPT },
  { role: 'user', content: buildUserMessage(places, constraints) },
]

export { buildMessages, SYSTEM_PROMPT, toPromptPlace }
