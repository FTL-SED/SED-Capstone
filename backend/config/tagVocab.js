// Canonical tag vocabulary for classifying a Pin's free-form `tags` into the
// engine's cuisine/diet/food-category buckets. This is the (still evolving)
// stand-in for Step 0's INTEREST_MAP/CUISINE_MAP canonical vocab — see
// ../.claude/roadmap/recommendation-engine.md — grown from the tags already
// used in ../prisma/seed.js and
// ../services/recommendation/recommend/mockGroups.js. Extend these sets as
// new tag values show up in real data.

// A tag from this set alone (without a specific cuisine) still marks a Pin
// as food-related.
const FOOD_INDICATOR_TAGS = new Set(['food', 'restaurant'])

// What a restaurant serves. Doubles as `place.cuisine` for the engine's
// cuisine-overlap scoring (score/score.js) and matching (helpers/helpers.js).
const CUISINE_TAGS = new Set([
  'mexican', 'italian', 'thai', 'japanese', 'chinese', 'indian',
  'french', 'mediterranean', 'vietnamese', 'korean', 'american',
  'seafood', 'noodles', 'steak', 'vegan',
])

// Dietary restrictions a restaurant can accommodate. Doubles as `place.diet`
// for the engine's hard diet filter (helpers/helpers.js's passesDiet).
// Overlaps CUISINE_TAGS on purpose ('vegan' is both a cuisine and a diet a
// place can serve) — matches how mockGroups.js already models it.
const DIET_TAGS = new Set([
  'vegan', 'vegetarian', 'gluten-free', 'halal', 'kosher', 'dairy-free', 'pescatarian',
])

export { FOOD_INDICATOR_TAGS, CUISINE_TAGS, DIET_TAGS }
