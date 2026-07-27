import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MEAL_TIME_WINDOWS,
  mealBlockAt,
  isInMealBlock,
  blocksOverlappingWindow,
} from './ai.js'

const at = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

test('mealBlockAt: returns the block a minute-of-day falls in, else null', () => {
  assert.equal(mealBlockAt(at('08:00')), 'breakfast')
  assert.equal(mealBlockAt(at('12:00')), 'lunch')
  assert.equal(mealBlockAt(at('18:00')), 'dinner')
  assert.equal(mealBlockAt(at('15:00')), null) // dead zone
  assert.equal(mealBlockAt(at('22:00')), null)
})

test('isInMealBlock: inclusive of the block edges', () => {
  assert.equal(isInMealBlock(at('07:00'), MEAL_TIME_WINDOWS.breakfast), true)
  assert.equal(isInMealBlock(at('10:45'), MEAL_TIME_WINDOWS.breakfast), true)
  assert.equal(isInMealBlock(at('10:46'), MEAL_TIME_WINDOWS.breakfast), false)
})

test('blocksOverlappingWindow: only blocks intersecting a same-day window', () => {
  assert.deepEqual(blocksOverlappingWindow('10:00', '20:30'), ['breakfast', 'lunch', 'dinner'])
  assert.deepEqual(blocksOverlappingWindow('11:30', '14:00'), ['lunch'])
  assert.deepEqual(blocksOverlappingWindow('14:00', '16:00'), []) // dead zone only
  assert.deepEqual(blocksOverlappingWindow('16:30', '21:00'), ['dinner'])
})

test('blocksOverlappingWindow: overnight / degenerate window returns []', () => {
  assert.deepEqual(blocksOverlappingWindow('22:00', '02:00'), [])
  assert.deepEqual(blocksOverlappingWindow('09:00', '09:00'), [])
})
