// Tunables for the recommendation engine (services/recommendation/).
// Every weight, quota, and threshold the engine uses lives here so behavior is
// changed by editing config, not code. See ../.claude/docs/recommendation-engine.md.

// A pin's category. Restaurants are the meal pool (diet/cuisine-matched);
// everything else is an activity. Centralized so the literal isn't scattered
// across the engine + AI services.
export const CATEGORY = { restaurant: 'restaurant', activity: 'activity' }

// priceLevel (0–4) → estimated cost per person in USD. Used for the budget
// sanity filter and to attach pricePerPerson to each pin.
export const PRICE_LEVEL_USD = { 0: 0, 1: 10, 2: 22, 3: 45, 4: 80 }

// Soft-score weights (must sum to 1). coverage = group fairness, intensity =
// strength of match, quality = rating signal, value = budget utilization (a mild
// nudge toward venues that actually use the group's budget instead of always
// defaulting to $0 options — small weight so it only breaks ties, never
// overrides relevance). See softScore in score/score.js.
export const WEIGHTS = { coverage: 0.45, intensity: 0.28, quality: 0.19, value: 0.08 }

// Food quota bounds: activities lead the shortlist (cap at FOOD_MAX), but meals
// are always guaranteed (floor-fill up to FOOD_MIN).
export const FOOD_MIN = 6
export const FOOD_MAX = 10

// Neutral rating for unrated pins, so missing data isn't punished to the
// bottom (0.6 ≈ 3/5). Enriched pins with real ratings float up naturally.
export const QUALITY_DEFAULT = 0.6

// Value (budget-utilization) term. The idea: a day should SPREAD its budget
// across its stops, so the fair price for one stop is roughly
// budget ÷ (number of stops the day will have). A pin priced near that per-stop
// target earns full value credit; a pin far ABOVE it (a single stop trying to
// eat most of the budget) is penalized so the ranking doesn't surface it; a pin
// below target still earns decent credit (using budget is good, just under-using
// one stop is fine). This replaces the old fixed "20% of budget" target, which
// let a $90 pin on a $100 budget score the same as a $20 one.
//
// perStopTarget = maxBudgetPerPerson / estimatedStops. Full credit within
// [target*(1-BAND), target*(1+BAND)]; above the band it tapers linearly to ~0 by
// VALUE_OVER_CUTOFF × target; below it scales up from VALUE_FLOOR at $0.
// Missing price or budget ⇒ VALUE_NEUTRAL (missing data isn't punished).
export const VALUE_NEUTRAL = 0.5
export const VALUE_BAND = 0.4          // ±40% around the per-stop target = full credit
export const VALUE_OVER_CUTOFF = 3     // a pin at 3× the target scores ~0 on value
export const VALUE_FLOOR = 0.5         // a $0 pin still gets half value credit (free is fine)
// Fallback per-stop share of budget when the trip window (hence stop count) is
// unknown — mirrors the old behavior so scoring still works without a window.
export const VALUE_FALLBACK_SHARE = 0.2

// intensity saturates at this many matches, so a pin isn't rewarded forever
// for piling on tag/cuisine overlaps: min(1, matches / INTENSITY_SATURATION).
export const INTENSITY_SATURATION = 3

// SHORTLIST_SIZE is computed per-trip from the time window (Step 6), not fixed:
//   stops = (endTime - startTime) / AVG_STOP_DURATION_MIN
//   SHORTLIST_SIZE = stops * SHORTLIST_MULTIPLIER
// so the AI gets ~2–3× as many options as there are stops to fill.
export const AVG_STOP_DURATION_MIN = 90
export const SHORTLIST_MULTIPLIER = 3

// Upper bound on a single stop's dwell time. The fallback sequencer stretches
// dwell times to fill an otherwise-short day (when the shortlist has too few
// places to fill the window at AVG length); this caps how long any one stop can
// grow so a thin day yields a few longer stops rather than one absurd 6-hour
// stop. A day that still can't reach the window end with every stop at this cap
// legitimately has too few places — the honest outcome, not a bug.
export const MAX_STOP_DURATION_MIN = 180

// How many top-scoring candidates get a shot at enrichment (Step 7 / stretch).
// Bounds the (future) Google API spend to at most this many lookups per
// generation, per ../.claude/docs/data-strategy.md.
export const ENRICHMENT_POOL_SIZE = 40

// Weiszfeld's algorithm (geometric-median meeting point, Stage 0) stops after
// this many iterations or once the estimate moves less than EPSILON miles —
// whichever comes first. See utils/geo.js and the Stage 0 design doc.
export const MEETING_POINT_MAX_ITERATIONS = 100
export const MEETING_POINT_EPSILON = 1e-6
