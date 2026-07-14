// Tunables for the recommendation engine (services/recommendation/).
// Every weight, quota, and threshold the engine uses lives here so behavior is
// changed by editing config, not code. See ../.claude/docs/recommendation-engine.md.

// priceLevel (0–4) → estimated cost per person in USD. Used for the budget
// sanity filter and to attach pricePerPerson to each place.
const PRICE_LEVEL_USD = { 0: 0, 1: 10, 2: 22, 3: 45, 4: 80 }

// Soft-score weights (must sum to 1). coverage = group fairness, intensity =
// strength of match, quality = rating signal.
const WEIGHTS = { coverage: 0.5, intensity: 0.3, quality: 0.2 }

// Food quota bounds: activities lead the shortlist (cap at FOOD_MAX), but meals
// are always guaranteed (floor-fill up to FOOD_MIN).
const FOOD_MIN = 6
const FOOD_MAX = 10

// Neutral rating for unrated places, so missing data isn't punished to the
// bottom (0.6 ≈ 3/5). Enriched places with real ratings float up naturally.
const QUALITY_DEFAULT = 0.6

// intensity saturates at this many matches, so a place isn't rewarded forever
// for piling on tag/cuisine overlaps: min(1, matches / INTENSITY_SATURATION).
const INTENSITY_SATURATION = 3

// SHORTLIST_SIZE is computed per-trip from the time window (Step 6), not fixed:
//   stops = (endTime - startTime) / AVG_STOP_DURATION_MIN
//   SHORTLIST_SIZE = stops * SHORTLIST_MULTIPLIER
// so the AI gets ~2–3× as many options as there are stops to fill.
const AVG_STOP_DURATION_MIN = 90
const SHORTLIST_MULTIPLIER = 3

// How many top-scoring candidates get a shot at enrichment (Step 7 / stretch).
// Bounds the (future) Google API spend to at most this many lookups per
// generation, per ../.claude/docs/data-strategy.md.
const ENRICHMENT_POOL_SIZE = 40

module.exports = {
  PRICE_LEVEL_USD,
  WEIGHTS,
  FOOD_MIN,
  FOOD_MAX,
  QUALITY_DEFAULT,
  INTENSITY_SATURATION,
  AVG_STOP_DURATION_MIN,
  SHORTLIST_MULTIPLIER,
  ENRICHMENT_POOL_SIZE,
}
