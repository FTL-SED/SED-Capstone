import { test } from 'node:test'
import assert from 'node:assert/strict'

import { computeShortlistSize, assembleWithFoodQuota } from './assemble.js'

test('computeShortlistSize scales with the trip window (stops * multiplier)', () => {
  // 9 hours / 90 min avg stop = 6 stops * 3x multiplier = 18.
  assert.equal(computeShortlistSize({ startTime: '09:00', endTime: '18:00' }), 18)
})

test('computeShortlistSize floors at FOOD_MIN for a very short window', () => {
  // 30 min window -> < 1 stop -> would round below FOOD_MIN without the floor.
  assert.equal(computeShortlistSize({ startTime: '09:00', endTime: '09:30' }), 6)
})

test('computeShortlistSize never goes negative for an inverted window', () => {
  assert.equal(computeShortlistSize({ startTime: '18:00', endTime: '09:00' }), 6)
})

const activity = (name, score) => ({ name, category: 'museum', tags: ['art'], score })
const restaurant = (name, score, rating) => ({ name, category: 'restaurant', tags: [], score, rating })

test('caps food at FOOD_MAX even when more restaurants rank higher than activities', () => {
  const ranked = [
    ...Array.from({ length: 15 }, (_, i) => restaurant(`R${i}`, 1 - i * 0.01)),
    ...Array.from({ length: 5 }, (_, i) => activity(`A${i}`, 0.5 - i * 0.01)),
  ]
  const result = assembleWithFoodQuota(ranked, ranked, 20)

  const foodCount = result.filter((p) => p.category === 'restaurant').length
  assert.equal(foodCount, 10) // FOOD_MAX
  assert.equal(result.length, 15) // all 5 activities still make it in
})

test('floor-fills to FOOD_MIN with best-rated remaining restaurants when few food items ranked', () => {
  const rankedActivities = Array.from({ length: 5 }, (_, i) => activity(`A${i}`, 0.9 - i * 0.05))
  const rankedRestaurants = [restaurant('LowRated', 0.2, 2.0), restaurant('MidRated', 0.15, 3.0)]
  const ranked = [...rankedActivities, ...rankedRestaurants]

  const extraRestaurants = [
    restaurant('Unrated', 0.05), // no rating
    restaurant('FourStar', 0.05, 4.0),
    restaurant('FiveStar', 0.05, 5.0),
    restaurant('ThreeStar', 0.05, 3.5),
  ]
  const candidates = [...ranked, ...extraRestaurants]

  const result = assembleWithFoodQuota(ranked, candidates, 20)
  const foodPins = result.filter((p) => p.category === 'restaurant')

  assert.ok(foodPins.length >= 6) // FOOD_MIN
  // best-rated ones should have been pulled in ahead of the unrated one
  assert.ok(foodPins.some((p) => p.name === 'FiveStar'))
  assert.ok(foodPins.some((p) => p.name === 'FourStar'))
})

test('treats (non-restaurant categories) never count against the food quota', () => {
  const treat = { name: 'Boba Shop', category: 'cafe', tags: ['boba'], score: 0.8 }
  const ranked = [treat, ...Array.from({ length: 11 }, (_, i) => restaurant(`R${i}`, 0.5 - i * 0.01))]

  const result = assembleWithFoodQuota(ranked, ranked, 20)

  assert.ok(result.some((p) => p.name === 'Boba Shop'))
  const foodCount = result.filter((p) => p.category === 'restaurant').length
  assert.equal(foodCount, 10) // still capped at FOOD_MAX, treat didn't eat into it
})

test('stops at shortlistSize once the food quota is already satisfied', () => {
  const ranked = [
    ...Array.from({ length: 6 }, (_, i) => restaurant(`R${i}`, 0.9 - i * 0.01, 4)),
    ...Array.from({ length: 10 }, (_, i) => activity(`A${i}`, 0.5 - i * 0.01)),
  ]
  const result = assembleWithFoodQuota(ranked, ranked, 8)

  assert.equal(result.length, 8)
})

test('does not mutate the ranked or candidates input arrays', () => {
  const ranked = [activity('A0', 0.9), restaurant('R0', 0.1, 3)]
  const candidates = [...ranked, restaurant('R1', 0.05, 5)]
  const rankedLength = ranked.length
  const candidatesLength = candidates.length

  assembleWithFoodQuota(ranked, candidates, 20)

  assert.equal(ranked.length, rankedLength)
  assert.equal(candidates.length, candidatesLength)
})
