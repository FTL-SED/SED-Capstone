// Tunables for the recommendation engine (services/recommendation/).
// Every weight, quota, and threshold the engine uses lives here so behavior is
// changed by editing config, not code. See ../.claude/docs/recommendation-engine.md.

// priceLevel (0–4) → estimated cost per person in USD. Used for the budget
// sanity filter and to attach pricePerPerson to each pin.
export const PRICE_LEVEL_USD = { 0: 0, 1: 10, 2: 22, 3: 45, 4: 80 }

// Soft-score weights (must sum to 1). coverage = group fairness, intensity =
// strength of match, quality = rating signal.
export const WEIGHTS = { coverage: 0.5, intensity: 0.3, quality: 0.2 }

// Food quota bounds: activities lead the shortlist (cap at FOOD_MAX), but meals
// are always guaranteed (floor-fill up to FOOD_MIN).
export const FOOD_MIN = 6
export const FOOD_MAX = 10

// Neutral rating for unrated pins, so missing data isn't punished to the
// bottom (0.6 ≈ 3/5). Enriched pins with real ratings float up naturally.
export const QUALITY_DEFAULT = 0.6

// intensity saturates at this many matches, so a pin isn't rewarded forever
// for piling on tag/cuisine overlaps: min(1, matches / INTENSITY_SATURATION).
export const INTENSITY_SATURATION = 3

// SHORTLIST_SIZE is computed per-trip from the time window (Step 6), not fixed:
//   stops = (endTime - startTime) / AVG_STOP_DURATION_MIN
//   SHORTLIST_SIZE = stops * SHORTLIST_MULTIPLIER
// so the AI gets ~2–3× as many options as there are stops to fill.
export const AVG_STOP_DURATION_MIN = 90
export const SHORTLIST_MULTIPLIER = 3

// How many top-scoring candidates get a shot at enrichment (Step 7 / stretch).
// Bounds the (future) Google API spend to at most this many lookups per
// generation, per ../.claude/docs/data-strategy.md.
export const ENRICHMENT_POOL_SIZE = 40

// Weiszfeld's algorithm (geometric-median meeting point, Stage 0) stops after
// this many iterations or once the estimate moves less than EPSILON miles —
// whichever comes first. See utils/geo.js and the Stage 0 design doc.
export const MEETING_POINT_MAX_ITERATIONS = 100
export const MEETING_POINT_EPSILON = 1e-6

// Geocoding member start addresses → coordinates (Stage 0 Part 2), via Mapbox.
// MAPBOX_PROXIMITY biases results toward San Francisco [lon, lat] so a bare
// place name ("Ferry Building") resolves locally. The access token is a secret
// read from process.env inside lib/geocode.js (kept out of the service layer).
export const MAPBOX_GEOCODE_URL = 'https://api.mapbox.com/search/geocode/v6/forward'
export const MAPBOX_PROXIMITY = { longitude: -122.4194, latitude: 37.7749 }
