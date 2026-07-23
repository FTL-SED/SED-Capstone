// Tag vocabularies the recommendation engine recognizes, mirrored from
// backend/config/tagVocab.js (cuisine + diet) and the seeded catalog's
// interest tags. Used to guide the wizard's interest/food inputs so users pick
// values the engine can match, instead of free text that silently misses.
// See .claude/roadmap/frontend-backend-integration.md (Step 10).
//
// NOTE: keep in sync with the backend if its vocab changes. A shared GET /tags
// endpoint would remove the duplication (see the roadmap's optional follow-up).

// Interests / activity tags (from the catalog's non-food tags). Ordered so the
// most broadly-appealing options come first (the wizard shows the first 8 by
// default). Also consumed by DiscoverPage/FilterControls (order only).
export const INTEREST_TAGS = [
  'art', 'museum', 'history', 'nature', 'scenic_views', 'music', 'shopping', 'walking',
  'architecture', 'landmark', 'photography', 'garden', 'hiking', 'beach', 'sunset',
  'relaxing', 'entertainment', 'indoor',
]

// Cuisines a place can serve (backend CUISINE_TAGS), most-common first.
export const CUISINE_TAGS = [
  'mexican', 'italian', 'sushi', 'thai', 'chinese', 'american', 'pizza', 'indian',
  'japanese', 'french', 'mediterranean', 'vietnamese', 'korean', 'bbq', 'seafood',
  'ramen', 'noodles', 'steak', 'burgers',
]

// Dietary needs a place can accommodate (backend DIET_TAGS). Short list — the
// wizard shows all of these with no "View more".
export const DIET_TAGS = [
  'vegan', 'vegetarian', 'gluten-free', 'halal', 'kosher', 'dairy-free', 'pescatarian',
]
