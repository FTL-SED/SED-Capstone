// Tunables + output schema for the AI itinerary sequencing service
// (services/ai/). Like config/recommendation.js, all AI knobs live here so
// behavior changes by editing config, not code. See ../.claude/docs/ai-design.md.

// Shared with the recommendation engine's shortlist-sizing — re-exported, not
// redefined, so the fallback's dwell-time can't drift from it.
export { AVG_STOP_DURATION_MIN } from './recommendation.js'

// AI gateway client tunables. AI_MODEL is the Salesforce model-gateway model
// id; timeout/retries bound how long we try before giving up to the
// deterministic fallback. Retries are for transient errors only (5xx, network
// timeout).
export const AI_MODEL =
  'claude-sonnet-4-5-20250929'
export const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 20_000
export const AI_MAX_RETRIES = Number(process.env.AI_MAX_RETRIES) || 2

// Meal anchors ("HH:MM", Pacific wall-clock) the prompt + fallback use to slot
// restaurants and label meal stops. Kept generously wide (and non-overlapping)
// so a sensible meal a little off the "ideal" hour still validates — a dinner
// at 17:25 or a late breakfast at 10:45 shouldn't get the whole AI itinerary
// rejected into the fallback over a few minutes.
export const MEAL_TIME_WINDOWS = {
  breakfast: { start: '07:00', end: '10:45' },
  lunch: { start: '11:00', end: '13:45' },
  dinner: { start: '17:00', end: '20:30' },
}

// Travel-time model, used by the scheduler to turn the straight-line distance
// between two stops into a realistic travel-time estimate.
//
// FALLBACK_TRAVEL_MPH is an effective urban point-to-point speed (~18 mph):
// well below a road's posted limit once lights, turns, and parking are folded
// in. ROAD_CIRCUITY scales the straight-line (crow-flies) distance up to an
// estimated ROAD distance — real streets aren't straight, so a route is
// typically ~1.35× the great-circle distance. We inflate distance only for the
// TIME estimate; the distance we display to users stays the honest straight
// line (see schedule.js).
export const FALLBACK_TRAVEL_MPH = Number(process.env.FALLBACK_TRAVEL_MPH) || 18
export const ROAD_CIRCUITY = Number(process.env.ROAD_CIRCUITY) || 1.35

// Effective urban point-to-point speed (mph) by transport mode — folds in
// lights/turns/parking/waits, so these sit well below posted limits. The
// scheduler picks the mode from the trip's `transport` constraint and falls
// back to FALLBACK_TRAVEL_MPH when it's unset or unrecognized.
export const TRAVEL_MPH_BY_MODE = {
  walking: 3,
  biking: 9,
  transit: 12,
  driving: 18,
}

// Straight-line miles → effective travel minutes for a given transport mode.
// Scales crow-flies distance up by ROAD_CIRCUITY (real streets aren't straight)
// then divides by the mode's speed. Shared by the fallback + scheduler so the
// two can't drift.
export function travelMinutesFor(miles, transport) {
  const mph = TRAVEL_MPH_BY_MODE[transport] ?? FALLBACK_TRAVEL_MPH
  return Math.round(((miles * ROAD_CIRCUITY) / mph) * 60)
}

// Output schema, shared by the AI call, response validation, and the fallback
// so downstream code never cares which produced the result. A stop is
// deliberately minimal — the AI only SEQUENCES: which shortlist pin (by
// pinId), when, and travel to the next stop. Everything else (name, coords,
// image, and cost) is a fact about the place, re-hydrated from the shortlist
// by pinId downstream — so the AI can neither hallucinate a place nor misprice
// one. Array order is the stop order. Times are "HH:MM" (matching
// validateRecommendationInput's TIME_RE), converted to DateTime at persistence.
const HHMM_PATTERN = '^([01][0-9]|2[0-3]):[0-5][0-9]$'

const STOP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['pinId', 'arriveTime', 'departTime'],
  properties: {
    pinId: { type: 'integer' },
    arriveTime: { type: 'string', pattern: HHMM_PATTERN },
    departTime: { type: 'string', pattern: HHMM_PATTERN },
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
