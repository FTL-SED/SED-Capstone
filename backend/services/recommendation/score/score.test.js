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

  const likedByAll = { category: 'museum', tags: ['art', 'coffee'] } // A and B both match
  const nicheForOne = { category: 'museum', tags: ['art'] } // only A matches

  const scoreAll = softScore(likedByAll, members, groupTags, groupFood)
  const scoreNiche = softScore(nicheForOne, members, groupTags, groupFood)

  assert.ok(scoreAll > scoreNiche, `${scoreAll} should be > ${scoreNiche}`)
})

test('rating breaks ties between otherwise-identical pins', () => {
  const members = [{ name: 'A', interestTags: ['art'] }]
  const groupTags = new Set(['art'])
  const groupFood = new Set()

  const rated = { category: 'museum', tags: ['art'], rating: 5 }
  const unrated = { category: 'museum', tags: ['art'] } // falls back to QUALITY_DEFAULT

  const scoreRated = softScore(rated, members, groupTags, groupFood)
  const scoreUnrated = softScore(unrated, members, groupTags, groupFood)

  assert.ok(scoreRated > scoreUnrated, `${scoreRated} should be > ${scoreUnrated}`)
})

test('intensity saturates so extra matches beyond INTENSITY_SATURATION stop helping', () => {
  const members = [{ name: 'A', interestTags: ['a', 'b', 'c', 'd', 'e'] }]
  const groupTags = new Set(['a', 'b', 'c', 'd', 'e'])
  const groupFood = new Set()

  const threeMatches = { category: 'park', tags: ['a', 'b', 'c'] }
  const fiveMatches = { category: 'park', tags: ['a', 'b', 'c', 'd', 'e'] }

  assert.equal(
    softScore(threeMatches, members, groupTags, groupFood),
    softScore(fiveMatches, members, groupTags, groupFood)
  )
})

test('restaurants score on cuisine overlap, not activity tags', () => {
  const members = [{ name: 'A', interestTags: ['art'], foodPrefs: ['sushi'] }]
  const groupTags = new Set(['art'])
  const groupFood = new Set(['sushi'])

  // tags overlap the group's interests but this is food, so tags must be ignored.
  const restaurant = { category: 'restaurant', tags: ['art'], cuisine: ['sushi'] }
  const noCuisineMatch = { category: 'restaurant', tags: ['art'], cuisine: ['pizza'] }

  const scoreMatch = softScore(restaurant, members, groupTags, groupFood)
  const scoreNoMatch = softScore(noCuisineMatch, members, groupTags, groupFood)

  assert.ok(scoreMatch > scoreNoMatch, `${scoreMatch} should be > ${scoreNoMatch}`)
})

test('returns 0 coverage/intensity (not a crash) when tags/cuisine are missing', () => {
  const members = [{ name: 'A', interestTags: ['art'] }]
  const groupTags = new Set(['art'])
  const groupFood = new Set()

  const bareActivity = { category: 'park' } // no tags at all
  const bareRestaurant = { category: 'restaurant' } // no cuisine at all

  // Should not throw, and should fall back to the neutral quality default only.
  assert.equal(softScore(bareActivity, members, groupTags, groupFood), 0.2 * 0.6)
  assert.equal(softScore(bareRestaurant, members, groupTags, groupFood), 0.2 * 0.6)
})

test('score stays within [0, 1] for a maximally-liked, top-rated pin', () => {
  const members = [{ name: 'A', interestTags: ['art'] }, { name: 'B', interestTags: ['art'] }]
  const groupTags = new Set(['art'])
  const groupFood = new Set()

  const best = { category: 'museum', tags: ['art'], rating: 5 }
  const score = softScore(best, members, groupTags, groupFood)
  assert.ok(score > 0 && score <= 1)
})

test('softScore: empty members group scores without NaN (coverage guarded)', () => {
  const score = softScore(
    { category: 'museum', tags: ['art'] },
    [],
    new Set(['art']),
    new Set()
  )
  assert.ok(!Number.isNaN(score), 'score must not be NaN for an empty group')
  assert.ok(score >= 0 && score <= 1)
})
