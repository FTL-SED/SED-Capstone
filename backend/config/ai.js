// Tunables + output schema for the AI itinerary sequencing service
// (services/ai/). Like config/recommendation.js, all AI knobs live here so
// behavior changes by editing config, not code. See ../.claude/docs/ai-design.md.

// Shared with the recommendation engine's shortlist-sizing — re-exported, not
// redefined, so the fallback's dwell-time can't drift from it.
export { AVG_STOP_DURATION_MIN } from './recommendation.js'

// OpenRouter client tunables. AI_MODEL defaults to a free-tier model
// (":free" suffix) and is env-overridable; timeout/retries bound how long we
// try before giving up to the deterministic fallback. Retries are for
// transient errors only (5xx, network timeout).
export const AI_MODEL =
  'openrouter/free'
export const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 20_000
export const AI_MAX_RETRIES = Number(process.env.AI_MAX_RETRIES) || 2

// Meal anchors ("HH:MM", Pacific wall-clock) the prompt + fallback use to slot
// restaurants and label meal stops.
export const MEAL_TIME_WINDOWS = {
  breakfast: { start: '08:00', end: '10:00' },
  lunch: { start: '11:30', end: '13:30' },
  dinner: { start: '17:30', end: '19:30' },
}

// Assumed average city travel speed, used by the fallback sequencer to turn a
// straight-line distance between two stops into a rough travel-time estimate.
export const FALLBACK_TRAVEL_MPH = Number(process.env.FALLBACK_TRAVEL_MPH) || 25

// Output schema, shared by the OpenRouter call, response validation (Step 4),
// and the fallback (Step 5) so downstream code never cares which produced the
// result. A stop is deliberately minimal — the AI only sequences (which
// shortlist pin by pinId, when, cost, travel to next); name/coords/image are
// re-hydrated from the shortlist so it can't hallucinate a place. Array order
// is the stop order. Times are "HH:MM" (matching validateRecommendationInput's
// TIME_RE), converted to DateTime at persistence.
const HHMM_PATTERN = '^([01][0-9]|2[0-3]):[0-5][0-9]$'

const STOP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['pinId', 'arriveTime', 'departTime', 'estimatedCostPerPerson'],
  properties: {
    pinId: { type: 'integer' },
    arriveTime: { type: 'string', pattern: HHMM_PATTERN },
    departTime: { type: 'string', pattern: HHMM_PATTERN },
    estimatedCostPerPerson: { type: 'number', minimum: 0 },
    note: { type: 'string' },
    mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner'] },
    travelTimeToNextMinutes: { type: ['integer', 'null'], minimum: 0 },
    distanceToNextMeters: { type: ['number', 'null'], minimum: 0 },
  },
}

// Success branch maps onto Itinerary + ordered Pin rows; the infeasible branch
// is the guardrail when no day fits the constraints.
const ITINERARY_SUCCESS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['feasible', 'title', 'location', 'description', 'stops'],
  properties: {
    feasible: { const: true },
    title: { type: 'string', minLength: 1 },
    location: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    stops: { type: 'array', minItems: 1, items: STOP_SCHEMA },
  },
}

const INFEASIBLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['feasible', 'reason'],
  properties: {
    feasible: { const: false },
    reason: { type: 'string', minLength: 1 },
  },
}

export const ITINERARY_SCHEMA = {
  oneOf: [ITINERARY_SUCCESS_SCHEMA, INFEASIBLE_SCHEMA],
}
