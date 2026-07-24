// Tag vocabularies the recommendation engine recognizes, mirrored from
// backend/config/tagVocab.js (cuisine + diet) and the seeded catalog's
// interest tags. Used to guide the wizard's interest/food inputs so users pick
// values the engine can match, instead of free text that silently misses.
// See .claude/roadmap/frontend-backend-integration.md (Step 10).
//
// NOTE: keep in sync with the backend if its vocab changes. A shared GET /tags
// endpoint would remove the duplication (see the roadmap's optional follow-up).

// Interests / activity tags — the canonical INTERESTS keys from
// backend/config/tagVocab.js. Ordered so the most broadly-appealing options come
// first (the wizard shows the first 8 by default). Also consumed by
// DiscoverPage/FilterControls (order only). 'live music' is stored spaced (not
// the canonical camelCase `liveMusic`) so it renders as "Live Music" through the
// pills' capitalize styling.
// NOTE: matching is raw-string overlap against catalog pins, and the catalog is
// not yet re-tagged to this taxonomy, so several of these won't match venues
// until that migration lands (see the venue-taxonomy-redesign spec).
export const INTEREST_TAGS = [
  'art', 'museums', 'history', 'architecture', 'nature', 'outdoors', 'scenic', 'photography',
  'coffee', 'food', 'desserts', 'markets', 'shopping', 'nightlife', 'live music',
  'entertainment', 'fitness', 'wellness',
]

// Cuisines a place can serve. These are the values actually stored on catalog
// pins' `cuisines` column — the engine matches member foodPrefs against them by
// raw string overlap (normalizeTag isn't wired in), so a pill that isn't a real
// catalog cuisine would silently match nothing. Most-common first. (Food-type
// words like sushi/pizza/bbq/ramen/burgers live under interests, not cuisine.)
export const CUISINE_TAGS = [
  'mexican', 'italian', 'thai', 'chinese', 'american', 'indian', 'japanese',
  'french', 'mediterranean', 'vietnamese', 'korean', 'seafood', 'steak',
]

// Dietary needs a place can accommodate (backend DIET_TAGS). Short list — the
// wizard shows all of these with no "View more".
export const DIET_TAGS = [
  'vegan', 'vegetarian', 'gluten-free', 'halal', 'kosher', 'dairy-free', 'pescatarian',
]
