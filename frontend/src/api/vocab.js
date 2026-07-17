// Tag vocabularies the recommendation engine recognizes, mirrored from
// backend/config/tagVocab.js (cuisine + diet) and the seeded catalog's
// interest tags. Used to guide the wizard's interest/food inputs so users pick
// values the engine can match, instead of free text that silently misses.
// See .claude/roadmap/frontend-backend-integration.md (Step 10).
//
// NOTE: keep in sync with the backend if its vocab changes. A shared GET /tags
// endpoint would remove the duplication (see the roadmap's optional follow-up).

// Interests / activity tags (from the catalog's non-food tags).
export const INTEREST_TAGS = [
  'art', 'museum', 'history', 'architecture', 'landmark', 'scenic_views',
  'photography', 'nature', 'garden', 'hiking', 'walking', 'beach', 'sunset',
  'relaxing', 'entertainment', 'music', 'shopping', 'indoor',
]

// Food preferences: cuisines + diets a place can serve (backend CUISINE_TAGS
// ∪ DIET_TAGS, minus 'vegan'/'vegetarian' duplication handled by the set).
export const FOOD_TAGS = [
  'mexican', 'italian', 'thai', 'sushi', 'japanese', 'chinese', 'indian',
  'french', 'mediterranean', 'vietnamese', 'korean', 'american', 'bbq',
  'seafood', 'pizza', 'ramen', 'noodles', 'steak', 'burgers',
  'vegan', 'vegetarian', 'gluten-free', 'halal', 'kosher', 'dairy-free', 'pescatarian',
]
