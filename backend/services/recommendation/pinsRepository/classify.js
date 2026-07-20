// Splits a Pin's free-form `tags` array into the explicit column values
// (category/interests/cuisines/diets). Replicates the derivation that
// pinsRepository.mapPin does at read-time today, so Phase 2's backfill can
// persist those values as real columns. Pure — no DB.
import { FOOD_INDICATOR_TAGS, CUISINE_TAGS, DIET_TAGS } from '../../../config/tagVocab.js'

const MEAL_TAGS = ['breakfast', 'lunch', 'dinner']
const MEAL_SET = new Set(MEAL_TAGS)

function classifyTags(tags) {
  const list = Array.isArray(tags) ? tags : []
  const cuisines = list.filter((t) => CUISINE_TAGS.has(t))
  const diets = list.filter((t) => DIET_TAGS.has(t))
  const isFood =
    list.some((t) => FOOD_INDICATOR_TAGS.has(t)) || cuisines.length > 0 || diets.length > 0
  // Interests = tags that aren't cuisine, diet, a food-indicator, or a meal word.
  const interests = list.filter(
    (t) =>
      !CUISINE_TAGS.has(t) &&
      !DIET_TAGS.has(t) &&
      !FOOD_INDICATOR_TAGS.has(t) &&
      !MEAL_SET.has(t),
  )
  return { category: isFood ? 'restaurant' : 'activity', interests, cuisines, diets }
}

export { classifyTags, MEAL_TAGS }
