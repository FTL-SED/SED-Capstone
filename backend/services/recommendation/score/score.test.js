import { test } from 'node:test'
import assert from 'node:assert/strict'

import { softScore } from './score.js'

test('a whole-group-liked pin outranks a niche one', () => {
  const members = [
    { name: 'A', interestTags: ['art'] },
    { name: 'B', interestTags: ['coffee'] },
  ]
  const groupTags = new Set(['art', 'coffee'])
  const groupFood = new Set()

  const likedByAll = { category: 'museum', interests: ['art', 'coffee'] } // A and B both match
  const nicheForOne = { category: 'museum', interests: ['art'] } // only A matches

  const scoreAll = softScore(likedByAll, members, groupTags, groupFood)
  const scoreNiche = softScore(nicheForOne, members, groupTags, groupFood)

  assert.ok(scoreAll > scoreNiche, `${scoreAll} should be > ${scoreNiche}`)
})

test('rating breaks ties between otherwise-identical pins', () => {
  const members = [{ name: 'A', interestTags: ['art'] }]
  const groupTags = new Set(['art'])
  const groupFood = new Set()

  const rated = { category: 'museum', interests: ['art'], rating: 5 }
  const unrated = { category: 'museum', interests: ['art'] } // falls back to QUALITY_DEFAULT

  const scoreRated = softScore(rated, members, groupTags, groupFood)
  const scoreUnrated = softScore(unrated, members, groupTags, groupFood)

  assert.ok(scoreRated > scoreUnrated, `${scoreRated} should be > ${scoreUnrated}`)
})

test('intensity saturates so extra matches beyond INTENSITY_SATURATION stop helping', () => {
  const members = [{ name: 'A', interestTags: ['a', 'b', 'c', 'd', 'e'] }]
  const groupTags = new Set(['a', 'b', 'c', 'd', 'e'])
  const groupFood = new Set()

  const threeMatches = { category: 'park', interests: ['a', 'b', 'c'] }
  const fiveMatches = { category: 'park', interests: ['a', 'b', 'c', 'd', 'e'] }

  assert.equal(
    softScore(threeMatches, members, groupTags, groupFood),
    softScore(fiveMatches, members, groupTags, groupFood)
  )
})

test('restaurants score on cuisine overlap, not activity tags', () => {
  const members = [{ name: 'A', interestTags: ['art'], foodPrefs: ['sushi'] }]
  const groupTags = new Set(['art'])
  const groupFood = new Set(['sushi'])

  // Restaurant fixtures keep cuisine and diet, don't use interests
  const restaurant = { category: 'restaurant', cuisine: ['sushi'], diet: [] }
  const noCuisineMatch = { category: 'restaurant', cuisine: ['pizza'], diet: [] }

  const scoreMatch = softScore(restaurant, members, groupTags, groupFood)
  const scoreNoMatch = softScore(noCuisineMatch, members, groupTags, groupFood)

  assert.ok(scoreMatch > scoreNoMatch, `${scoreMatch} should be > ${scoreNoMatch}`)
})

test('returns 0 coverage/intensity (not a crash) when interests/cuisine are missing', () => {
  const members = [{ name: 'A', interestTags: ['art'] }]
  const groupTags = new Set(['art'])
  const groupFood = new Set()

  const bareActivity = { category: 'park' } // no interests at all
  const bareRestaurant = { category: 'restaurant' } // no cuisine at all

  // Should not throw, and should fall back to the neutral quality default only.
  assert.equal(softScore(bareActivity, members, groupTags, groupFood), 0.2 * 0.6)
  assert.equal(softScore(bareRestaurant, members, groupTags, groupFood), 0.2 * 0.6)
})

test('score stays within [0, 1] for a maximally-liked, top-rated pin', () => {
  const members = [{ name: 'A', interestTags: ['art'] }, { name: 'B', interestTags: ['art'] }]
  const groupTags = new Set(['art'])
  const groupFood = new Set()

  const best = { category: 'museum', interests: ['art'], rating: 5 }
  const score = softScore(best, members, groupTags, groupFood)
  assert.ok(score > 0 && score <= 1)
})

test('softScore: empty members group scores without NaN (coverage guarded)', () => {
  const score = softScore(
    { category: 'museum', interests: ['art'] },
    [],
    new Set(['art']),
    new Set()
  )
  assert.ok(!Number.isNaN(score), 'score must not be NaN for an empty group')
  assert.ok(score >= 0 && score <= 1)
})

test('activity pin with interests (no tags) is matched by member interestTags', () => {
  const members = [{ name: 'A', interestTags: ['museum'], foodPrefs: [] }]
  const groupTags = new Set(['museum'])
  const groupFood = new Set()

  const activityPin = { category: 'museum', interests: ['museum'] } // no tags field
  const score = softScore(activityPin, members, groupTags, groupFood)

  // Should score > 0 because member matches on interests
  assert.ok(score > 0, `activity pin with matching interests should score > 0, got ${score}`)
})

test('activity pin whose only overlap was a food word is NOT matched', () => {
  const members = [{ name: 'A', interestTags: ['italian'], foodPrefs: ['italian'] }]
  const groupTags = new Set(['italian'])
  const groupFood = new Set(['italian'])

  // This pin has 'italian' only in cuisine (food), not in interests
  const activityPin = { category: 'gallery', interests: ['art'], cuisine: ['italian'] }

  // Should NOT match because 'italian' is not in interests
  const score = softScore(activityPin, members, groupTags, groupFood)
  assert.equal(score, 0.2 * 0.6, 'activity pin should only match on interests, not cuisine')
})
