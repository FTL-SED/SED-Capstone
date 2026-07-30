
// Tunables + output schema for the AI itinerary sequencing service
// (services/ai/). Like config/recommendation.js, all AI knobs live here so
// behavior changes by editing config, not code. See ../.claude/docs/ai-design.md.

// Shared with the recommendation engine — re-exported, not redefined, so the
// fallback's dwell-time and the pin-category vocabulary can't drift from it.
// Also imported locally (a re-export creates no local binding) so tunables
// below, like COVERAGE_SLACK_MIN, can derive from AVG_STOP_DURATION_MIN.
import { AVG_STOP_DURATION_MIN, CATEGORY } from './recommendation.js'
export { AVG_STOP_DURATION_MIN, MAX_STOP_DURATION_MIN, CATEGORY } from './recommendation.js'

// How long people typically spend at a stop, by venue kind — a café is a quick
// stop, a museum is a long one, so a flat 90 min looks wrong for both. The AI
// sequencer already varies dwell by type; this table is what the DETERMINISTIC
// fallback uses so its days look just as realistic, and what the prompt shows
// the model as guidance. Keyed by an interest/tag substring match (a pin's
// interests[]), falling back to the category default. Minutes.
// These are conservative BASELINES on purpose: the window-fill pass stretches
// stops upward to reach the end time, so a baseline that's already generous
// (e.g. 60 for a quick browse) balloons to 90+ after stretch. Keeping quick/
// browsable stops at 30–45 leaves room to stretch INTO a natural ~1hr, rather
// than starting there and overshooting.
export const STOP_DURATION_BY_TYPE = {
  // very quick — a drink, a treat (30 min)
  coffee: 30, dessert: 30, desserts: 30, bakery: 30, boba: 30,
  // short — sit-down café, a photo stop, a wellness stop (45 min)
  cafe: 45, photography: 45, wellness: 45,
  // medium — most stops land here (60 min): a bar, scenic spots, landmarks,
  // browsing a shop/market, a gallery/history/art/architecture visit, a
  // nightlife venue, a class/workout, an outdoor walk, general exploration
  bar: 60, scenic: 60, scenic_views: 60, viewpoint: 60, landmark: 60,
  shopping: 60, markets: 60, fitness: 60, nightlife: 60,
  nature: 60, outdoors: 60, walking: 60, entertainment: 60,
  art: 60, history: 60, gallery: 60, architecture: 60,
  // longer — a live-music set and museums (90 / 120). Keys are matched after
  // lowercasing (see stopDurationFor), so list the lowercased forms of the
  // interest tag ('liveMusic' → 'livemusic', plus the spaced frontend variant).
  livemusic: 90, 'live music': 90,
  museum: 120, museums: 120,
}

// Category defaults when no tag matches above. A generic activity is 60 min (a
// moderate stop the fill can stretch), NOT the old 90 — 90 left too little
// stretch headroom before hitting the per-stop cap. Restaurants are handled
// separately by meal type via the fallback's meal logic.
const CATEGORY_DURATION = {
  [CATEGORY.activity]: 60,
  [CATEGORY.restaurant]: AVG_STOP_DURATION_MIN,
}

// Typical dwell for a NON-MEAL activity stop, from its tags then its category.
// Returns minutes. NOTE: the fallback deliberately keeps MEALS at
// AVG_STOP_DURATION_MIN — its meal-block fit math and the validator's
// requiredMealBlocks both reserve exactly AVG_STOP_DURATION_MIN per meal, so a
// longer fallback meal could overflow a window the validator deemed
// meal-required and fail re-validation. Only activities vary here; the AI (which
// re-validates its own output) is free to use richer meal durations via the
// prompt guidance.
export function stopDurationFor(pin) {
  for (const tag of pin?.interests ?? []) {
    const key = String(tag).toLowerCase()
    if (STOP_DURATION_BY_TYPE[key] != null) return STOP_DURATION_BY_TYPE[key]
  }
  return CATEGORY_DURATION[pin?.category] ?? AVG_STOP_DURATION_MIN
}

// AI gateway client tunables. AI_MODEL is the Salesforce model-gateway model
// id; timeout/retries bound how long we try before giving up to the
// deterministic fallback. Retries are for transient errors only (5xx, network
// timeout).
export const AI_MODEL =
  'claude-sonnet-4-5-20250929'
// OpenAI model id, used when the client talks to OpenAI directly instead of the
// Salesforce gateway (they namespace model ids differently, so the gateway id
// above isn't valid there). gpt-5 is the strongest tier — chosen for reliable
// sequencing (nano truncated its JSON under the reasoning-token budget); still
// only a few cents per itinerary. Override with OPENAI_MODEL for a cheaper tier
// (e.g. gpt-5-mini) if spend matters more than reliability.
export const AI_OPENAI_MODEL =
  process.env.OPENAI_MODEL || 'gpt-5'

// Reasoning effort for OpenAI reasoning models (gpt-5 family). Sequencing a
// shortlist is a structured, shallow task, so 'low' keeps gpt-5's quality while
// roughly halving latency vs the default: measured ~28s at 'low' vs ~48s
// default / ~71s 'medium' for one full itinerary. Only sent on the OpenAI path
// (the Salesforce gateway / Claude doesn't accept this param). Override with
// OPENAI_REASONING_EFFORT (low | medium | high) if you want deeper reasoning.
export const AI_OPENAI_REASONING_EFFORT =
  process.env.OPENAI_REASONING_EFFORT || 'low'
// gpt-5 is a reasoning model: it spends hidden thinking tokens before emitting
// the itinerary, so a full sequencing call can take much longer than a
// non-reasoning model. 20s was tuned for the old nano/gateway path and would
// time out gpt-5 mid-think → needless retry → fallback. 60s gives it room while
// still bounding how long we wait before giving up to the deterministic fallback.
export const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 60_000
export const AI_MAX_RETRIES = Number(process.env.AI_MAX_RETRIES) || 2

// How many times to re-ask the model with its validation errors fed back before
// giving up to the deterministic fallback. Distinct from AI_MAX_RETRIES (which
// retries transient NETWORK errors): this retries a well-formed but rule-broken
// itinerary (e.g. over budget). 2 rounds matches the model's observed
// convergence; each round is another billed call, so keep it small.
export const AI_VALIDATION_RETRIES = Number(process.env.AI_VALIDATION_RETRIES) || 2

// Hard ceiling on tokens the model may generate per call (reasoning + visible
// output for reasoning models like gpt-5). A finished itinerary JSON is ~1–2k
// tokens, but a reasoning model spends additional hidden tokens thinking first —
// 2k truncated the JSON mid-output ("Unexpected end of JSON input"), so this
// gives reasoning + output ample room. Still a cost guardrail against a runaway
// generation. Override with AI_MAX_OUTPUT_TOKENS if needed.
export const AI_MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS) || 8_000

// How close to the trip's end time the LAST stop must depart for a day to count
// as "covering" the window. The coverage backstop rejects (→ fallback, or on the
// fallback path triggers window-fill) a day whose last stop departs more than
// this many minutes before the window end. A flat 90 was far too generous on a
// short window — a 5-hour day ending 42 min early passed as "full" even though a
// whole stop was missing. So the slack now SCALES with the window: a fraction of
// it, capped at COVERAGE_SLACK_MAX_MIN. On a 5h (300min) window that's 45 min;
// on a 12h window it stays at the 45-min cap, still lenient enough not to nag a
// reasonable early finish.
export const COVERAGE_SLACK_FRACTION = Number(process.env.COVERAGE_SLACK_FRACTION) || 0.15
export const COVERAGE_SLACK_MAX_MIN = Number(process.env.COVERAGE_SLACK_MAX_MIN) || 45
export function coverageSlackFor(windowLenMinutes) {
  if (!(windowLenMinutes > 0)) return COVERAGE_SLACK_MAX_MIN
  return Math.min(COVERAGE_SLACK_MAX_MIN, Math.round(windowLenMinutes * COVERAGE_SLACK_FRACTION))
}

// When the day is short of the window end, the fill pass stretches existing
// stops' dwell — but only up to this many minutes OVER each stop's natural
// per-type duration (stopDurationFor), so a quick café can't be inflated into a
// multi-hour event. A stop may run up to 30 min beyond its baseline; beyond that
// the day should gain another stop, not a longer one.
export const STOP_STRETCH_MAX_MIN = Number(process.env.STOP_STRETCH_MAX_MIN) || 30

// Budget grace band. A day whose per-person total exceeds the budget by no more
// than this is KEPT (not rejected to the fallback) — a $151 day on a $150 budget
// is materially the same as a $150 one, and keeping the better AI-sequenced day
// beats swapping it for a worse deterministic one over a dollar. The overage is
// surfaced to the frontend (see the itinerary's over-budget flag) so it's
// transparent, never hidden. Scales with budget: a flat $5 is a quarter of a $20
// budget but trivial on $200, so use the LARGER of $5 and a small fraction.
// Beyond the grace band the day is still rejected (that's what the retries fix).
export const BUDGET_GRACE_FLAT = Number(process.env.BUDGET_GRACE_FLAT) || 5
export const BUDGET_GRACE_FRACTION = Number(process.env.BUDGET_GRACE_FRACTION) || 0.05
export function budgetGraceFor(maxBudgetPerPerson) {
  if (typeof maxBudgetPerPerson !== 'number' || maxBudgetPerPerson <= 0) return BUDGET_GRACE_FLAT
  return Math.max(BUDGET_GRACE_FLAT, Math.round(maxBudgetPerPerson * BUDGET_GRACE_FRACTION))
}

// Meal anchors ("HH:MM", Pacific wall-clock) the prompt + fallback use to slot
// restaurants and label meal stops. Kept generously wide so a sensible meal a
// little off the "ideal" hour still validates rather than getting the whole AI
// itinerary rejected into the fallback over a few minutes. The blocks are
// non-overlapping (breakfast ends before lunch starts, lunch before dinner) so a
// stop's arriveTime maps to at most one block.
export const MEAL_TIME_WINDOWS = {
  breakfast: { start: '07:00', end: '11:00' },
  lunch: { start: '12:00', end: '16:00' },
  dinner: { start: '17:00', end: '22:00' },
}

// Meal blocks that are REQUIRED when a group wants meals — every enforceable one
// must have a meal stop (validator) and gets a reserved restaurant (fallback).
// Breakfast is deliberately omitted: a real group day usually opens with an
// activity, not a sit-down breakfast, so forcing one rejected almost every
// morning-start AI itinerary into the fallback. Breakfast is still ALLOWED (a
// stop may tag mealType:"breakfast"), just never demanded.
export const REQUIRED_MEAL_BLOCKS = ['lunch', 'dinner']

// Minute-of-day helpers over MEAL_TIME_WINDOWS, shared by the fallback,
// scheduler, and validator so the meal-window vocabulary lives in one place.
// Windows are absolute daytime (Pacific wall-clock, none cross midnight), so
// callers pass a plain minute-of-day (0–1439), not an elapsed-from-start value.
const hhmmToMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// True when a minute-of-day is inside a block, inclusive of both edges.
export function isInMealBlock(minsOfDay, block) {
  return minsOfDay >= hhmmToMinutes(block.start) && minsOfDay <= hhmmToMinutes(block.end)
}

// The meal block a minute-of-day falls in (breakfast/lunch/dinner), else null.
export function mealBlockAt(minsOfDay) {
  for (const [name, block] of Object.entries(MEAL_TIME_WINDOWS)) {
    if (isInMealBlock(minsOfDay, block)) return name
  }
  return null
}

// Meal block names whose absolute daytime window intersects a SAME-DAY trip
// window [start, end]. Returns [] for an overnight or zero-length window
// (end <= start) — meal enforcement intentionally applies only to same-day
// trips, the overwhelming common case.
export function blocksOverlappingWindow(startHHMM, endHHMM) {
  const start = hhmmToMinutes(startHHMM)
  const end = hhmmToMinutes(endHHMM)
  if (end <= start) return []
  return Object.entries(MEAL_TIME_WINDOWS)
    .filter(([, block]) => hhmmToMinutes(block.start) <= end && hhmmToMinutes(block.end) >= start)
    .map(([name]) => name)
}

// Meal block names where a stop of `stopDurationMin` can actually BE SEATED
// (arrive + dwell fits within BOTH the trip window AND the block's open hours).
// This is the SHARED predicate validation + fallback use to agree on which
// blocks are ENFORCEABLE. A block can overlap the window (required by validation
// before this fix) yet be unfillable (e.g. dinner 17:00–20:30 vs trip 10:00–18:00:
// earliest possible arrival is max(17:00,10:00)=17:00, +90min dwell = 18:30 >
// 18:00 window end → can't fit). Returns [] for degenerate windows.
export function enforceableMealBlocks(startHHMM, endHHMM, stopDurationMin) {
  const start = hhmmToMinutes(startHHMM)
  const end = hhmmToMinutes(endHHMM)
  if (end <= start) return []
  return Object.entries(MEAL_TIME_WINDOWS)
    .filter(([, block]) => {
      const blockStart = hhmmToMinutes(block.start)
      const blockEnd = hhmmToMinutes(block.end)
      // Earliest we could arrive at this block (trip start or block open, whichever is later)
      const arrivalMin = Math.max(blockStart, start)
      // Does a full stop fit? Must depart before both window end AND block close.
      const departTime = arrivalMin + stopDurationMin
      return arrivalMin <= blockEnd && departTime <= end && departTime <= blockEnd
    })
    .map(([name]) => name)
}

// The meal blocks to REQUIRE (validator) and RESERVE (fallback): the enforceable
// blocks intersected with REQUIRED_MEAL_BLOCKS. This is the single shared source
// of "which meals must a day have", so validation and the fallback can't drift.
// Breakfast, being outside REQUIRED_MEAL_BLOCKS, never appears here — enforceable
// or not — so a morning day is no longer rejected/padded for lacking breakfast.
export function requiredMealBlocks(startHHMM, endHHMM, stopDurationMin) {
  return enforceableMealBlocks(startHHMM, endHHMM, stopDurationMin).filter((b) =>
    REQUIRED_MEAL_BLOCKS.includes(b),
  )
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

// The canonical set of transport modes, derived from the speed table above so
// the two can't drift. Shared by the input validators (recommendation + edit)
// and available to the frontend's transport picker.
export const TRANSPORT_MODES = Object.keys(TRAVEL_MPH_BY_MODE)

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

// --- AI banner generation (gpt-image-1) ---------------------------------
// Cover-image generation for the create-itinerary wizard. Separate from the
// sequencing model above: this is an IMAGE model, called via lib/imageClient.js.

// OpenAI image model id. gpt-image-1 is OpenAI's current text-to-image model.
export const BANNER_MODEL = 'gpt-image-1'

// Landscape, banner-shaped output — the cover renders wide (see CoverImage).
export const BANNER_IMAGE_SIZE = '1536x1024'

// Cap on the user's free-text style prompt, to bound the request and cost.
export const BANNER_PROMPT_MAX_CHARS = 500

// Per-user rate limit on POST /ai-agent/banner: at most 10 generations per
// rolling hour. This is the real cost guardrail (the 3-cap above is bypassable
// by refreshing the wizard).
export const BANNER_RATE_LIMIT_MAX = Number(process.env.BANNER_RATE_LIMIT_MAX) || 10
export const BANNER_RATE_LIMIT_WINDOW_MS =
  Number(process.env.BANNER_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000
