import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyTags, MEAL_TAGS } from './classify.js'

test('classifyTags: a cuisine tag makes it a restaurant and fills cuisines', () => {
  const r = classifyTags(['food', 'chinese', 'dinner'])
  assert.equal(r.category, 'restaurant')
  assert.deepEqual(r.cuisines, ['chinese'])
  assert.deepEqual(r.diets, [])
  // 'food' is a food-indicator, 'dinner' is a meal word — neither is an interest
  assert.deepEqual(r.interests, [])
})

test('classifyTags: activity tags stay interests, category activity', () => {
  const r = classifyTags(['scenic_views', 'landmark', 'photography'])
  assert.equal(r.category, 'activity')
  assert.deepEqual(r.cuisines, [])
  assert.deepEqual(r.diets, [])
  assert.deepEqual(r.interests, ['scenic_views', 'landmark', 'photography'])
})

test('classifyTags: a diet tag alone marks restaurant and fills diets', () => {
  const r = classifyTags(['vegan'])
  // 'vegan' is in both CUISINE_TAGS and DIET_TAGS, so it lands in both
  assert.equal(r.category, 'restaurant')
  assert.ok(r.diets.includes('vegan'))
})

test('classifyTags: mixed food+activity tags — food wins category, non-food stays interests', () => {
  const r = classifyTags(['food', 'mexican', 'casual'])
  assert.equal(r.category, 'restaurant')
  assert.deepEqual(r.cuisines, ['mexican'])
  assert.deepEqual(r.interests, ['casual']) // 'casual' isn't cuisine/diet/food/meal
})

test('classifyTags: empty tags → activity, all arrays empty', () => {
  const r = classifyTags([])
  assert.deepEqual(r, { category: 'activity', interests: [], cuisines: [], diets: [] })
})

test('classifyTags: undefined tags → activity, all arrays empty', () => {
  const r = classifyTags(undefined)
  assert.deepEqual(r, { category: 'activity', interests: [], cuisines: [], diets: [] })
})

test('MEAL_TAGS lists the three meal words', () => {
  assert.deepEqual(MEAL_TAGS, ['breakfast', 'lunch', 'dinner'])
})
