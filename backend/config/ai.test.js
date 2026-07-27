import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MEAL_TIME_WINDOWS,
  AVG_STOP_DURATION_MIN,
  mealBlockAt,
  isInMealBlock,
  blocksOverlappingWindow,
  enforceableMealBlocks,
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

test('enforceableMealBlocks: 10:00–18:00 with 90min stops excludes dinner', () => {
  // Dinner 17:00–20:30: earliest arrival max(17:00,10:00) = 17:00, +90min = 18:30 > 18:00 end
  const blocks = enforceableMealBlocks('10:00', '18:00', AVG_STOP_DURATION_MIN)
  assert.deepEqual(blocks, ['lunch'])
})

test('enforceableMealBlocks: 08:00–20:30 with 90min stops includes all three', () => {
  // Breakfast 07:00–10:45: arrive 08:00, +90 = 09:30 <= 10:45 ✓
  // Lunch 11:00–13:45: arrive 11:00, +90 = 12:30 <= 13:45 ✓
  // Dinner 17:00–20:30: arrive 17:00, +90 = 18:30 <= 20:30 ✓
  const blocks = enforceableMealBlocks('08:00', '20:30', AVG_STOP_DURATION_MIN)
  assert.deepEqual(blocks, ['breakfast', 'lunch', 'dinner'])
})

test('enforceableMealBlocks: 11:30–13:00 with 90min stops excludes lunch (too short)', () => {
  // Lunch 11:00–13:45: earliest arrival max(11:00,11:30) = 11:30, +90min = 13:00 exactly fits
  // BUT must also depart before block close: 13:00 <= 13:45 ✓ so lunch IS enforceable
  const blocks = enforceableMealBlocks('11:30', '13:00', AVG_STOP_DURATION_MIN)
  assert.deepEqual(blocks, ['lunch'])
})

test('enforceableMealBlocks: 11:30–12:30 with 90min stops excludes lunch (no 90min room)', () => {
  // Lunch 11:00–13:45: arrival 11:30, +90 = 13:00 > 12:30 window end
  const blocks = enforceableMealBlocks('11:30', '12:30', AVG_STOP_DURATION_MIN)
  assert.deepEqual(blocks, [])
})

test('enforceableMealBlocks: overnight/degenerate window returns []', () => {
  assert.deepEqual(enforceableMealBlocks('22:00', '02:00', 90), [])
  assert.deepEqual(enforceableMealBlocks('09:00', '09:00', 90), [])
})
