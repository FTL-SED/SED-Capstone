import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MEAL_TIME_WINDOWS,
  AVG_STOP_DURATION_MIN,
  mealBlockAt,
  isInMealBlock,
  blocksOverlappingWindow,
  enforceableMealBlocks,
  requiredMealBlocks,
  REQUIRED_MEAL_BLOCKS,
  stopDurationFor,
} from './ai.js'

const at = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

test('mealBlockAt: returns the block a minute-of-day falls in, else null', () => {
  // Windows: breakfast 07:00-11:00, lunch 11:30-14:30, dinner 17:00-21:00.
  assert.equal(mealBlockAt(at('08:00')), 'breakfast')
  assert.equal(mealBlockAt(at('13:00')), 'lunch')
  assert.equal(mealBlockAt(at('19:00')), 'dinner')
  assert.equal(mealBlockAt(at('11:15')), null) // gap between breakfast and lunch
  assert.equal(mealBlockAt(at('16:00')), null) // gap between lunch and dinner
  assert.equal(mealBlockAt(at('23:00')), null) // after dinner
})

test('isInMealBlock: inclusive of the block edges', () => {
  assert.equal(isInMealBlock(at('07:00'), MEAL_TIME_WINDOWS.breakfast), true)
  assert.equal(isInMealBlock(at('11:00'), MEAL_TIME_WINDOWS.breakfast), true)
  assert.equal(isInMealBlock(at('11:01'), MEAL_TIME_WINDOWS.breakfast), false)
})

test('meal windows are the required ranges (breakfast 7-11, lunch 11:30-14:30, dinner 17-21)', () => {
  // Lunch strictly 11:30-14:30.
  assert.equal(isInMealBlock(at('11:29'), MEAL_TIME_WINDOWS.lunch), false)
  assert.equal(isInMealBlock(at('11:30'), MEAL_TIME_WINDOWS.lunch), true)
  assert.equal(isInMealBlock(at('14:30'), MEAL_TIME_WINDOWS.lunch), true)
  assert.equal(isInMealBlock(at('14:31'), MEAL_TIME_WINDOWS.lunch), false)
  // Dinner strictly 17:00-21:00.
  assert.equal(isInMealBlock(at('16:59'), MEAL_TIME_WINDOWS.dinner), false)
  assert.equal(isInMealBlock(at('17:00'), MEAL_TIME_WINDOWS.dinner), true)
  assert.equal(isInMealBlock(at('21:00'), MEAL_TIME_WINDOWS.dinner), true)
  assert.equal(isInMealBlock(at('21:01'), MEAL_TIME_WINDOWS.dinner), false)
})

test('blocksOverlappingWindow: only blocks intersecting a same-day window', () => {
  assert.deepEqual(blocksOverlappingWindow('10:00', '22:00'), ['breakfast', 'lunch', 'dinner'])
  assert.deepEqual(blocksOverlappingWindow('12:30', '14:00'), ['lunch'])
  assert.deepEqual(blocksOverlappingWindow('16:15', '16:45'), []) // gap between lunch and dinner
  assert.deepEqual(blocksOverlappingWindow('18:30', '21:00'), ['dinner'])
})

test('blocksOverlappingWindow: overnight / degenerate window returns []', () => {
  assert.deepEqual(blocksOverlappingWindow('22:00', '02:00'), [])
  assert.deepEqual(blocksOverlappingWindow('09:00', '09:00'), [])
})

test('enforceableMealBlocks: 10:00–18:00 with 60min stops includes all three', () => {
  // Breakfast 07:00–11:00: arrival max(07:00,10:00) = 10:00, +60min = 11:00 <= 11:00 close ✓.
  // Lunch 11:30–14:30: arrive max(11:30,10:00) = 11:30, +60 = 12:30 <= 14:30 and <= 18:00 ✓.
  // Dinner 17:00–21:00: arrival max(17:00,10:00) = 17:00, +60 = 18:00 <= 18:00 end ✓.
  const blocks = enforceableMealBlocks('10:00', '18:00', AVG_STOP_DURATION_MIN)
  assert.deepEqual(blocks, ['breakfast', 'lunch', 'dinner'])
})

test('enforceableMealBlocks: 08:00–22:00 with 60min stops includes all three', () => {
  // Breakfast 07:00–11:00: arrive 08:00, +60 = 09:00 <= 11:00 ✓
  // Lunch 11:30–14:30: arrive 11:30, +60 = 12:30 <= 14:30 ✓
  // Dinner 17:00–21:00: arrive 17:00, +60 = 18:00 <= 21:00 ✓
  const blocks = enforceableMealBlocks('08:00', '22:00', AVG_STOP_DURATION_MIN)
  assert.deepEqual(blocks, ['breakfast', 'lunch', 'dinner'])
})

test('enforceableMealBlocks: 12:30–13:30 with 60min stops includes lunch (exactly fits)', () => {
  // Lunch 11:30–14:30: earliest arrival max(11:30,12:30) = 12:30, +60min = 13:30 exactly fits
  // the 13:30 window end and is <= the 14:30 block close, so lunch IS enforceable.
  const blocks = enforceableMealBlocks('12:30', '13:30', AVG_STOP_DURATION_MIN)
  assert.deepEqual(blocks, ['lunch'])
})

test('enforceableMealBlocks: 12:30–13:00 with 60min stops excludes lunch (no 60min room)', () => {
  // Lunch 11:30–14:30: arrival 12:30, +60 = 13:30 > 13:00 window end.
  const blocks = enforceableMealBlocks('12:30', '13:00', AVG_STOP_DURATION_MIN)
  assert.deepEqual(blocks, [])
})

test('enforceableMealBlocks: overnight/degenerate window returns []', () => {
  assert.deepEqual(enforceableMealBlocks('22:00', '02:00', 90), [])
  assert.deepEqual(enforceableMealBlocks('09:00', '09:00', 90), [])
})

test('REQUIRED_MEAL_BLOCKS omits breakfast', () => {
  assert.deepEqual(REQUIRED_MEAL_BLOCKS, ['lunch', 'dinner'])
})

test('requiredMealBlocks: never includes breakfast even on an early-start full day', () => {
  // 08:00–20:30 makes all three enforceable, but only lunch + dinner are required.
  assert.deepEqual(enforceableMealBlocks('08:00', '20:30', AVG_STOP_DURATION_MIN), ['breakfast', 'lunch', 'dinner'])
  assert.deepEqual(requiredMealBlocks('08:00', '20:30', AVG_STOP_DURATION_MIN), ['lunch', 'dinner'])
})

test('requiredMealBlocks: 10:00–18:00 keeps lunch and dinner', () => {
  // With 60min stops dinner fits (17:00 + 60 = 18:00 <= 18:00 end); breakfast is
  // enforceable but never required, so lunch + dinner survive the intersection.
  assert.deepEqual(requiredMealBlocks('10:00', '18:00', AVG_STOP_DURATION_MIN), ['lunch', 'dinner'])
})

test('stopDurationFor: sizes dwell by venue tag, falls back to category default', () => {
  // Very quick stops start SHORT (30) so the fill pass can stretch them into a
  // natural ~1hr without overshooting.
  assert.equal(stopDurationFor({ category: 'activity', interests: ['coffee'] }), 30)
  assert.equal(stopDurationFor({ category: 'activity', interests: ['photography'] }), 45)
  assert.equal(stopDurationFor({ category: 'activity', interests: ['cafe'] }), 45)
  assert.equal(stopDurationFor({ category: 'activity', interests: ['bar'] }), 60)
  // Most stops sit at 60: scenic, landmark, shopping, fitness, nightlife, art,
  // history, gallery, nature, general exploration.
  assert.equal(stopDurationFor({ category: 'activity', interests: ['scenic'] }), 60)
  assert.equal(stopDurationFor({ category: 'activity', interests: ['shopping'] }), 60)
  assert.equal(stopDurationFor({ category: 'activity', interests: ['fitness'] }), 60)
  assert.equal(stopDurationFor({ category: 'activity', interests: ['nightlife'] }), 60)
  assert.equal(stopDurationFor({ category: 'activity', interests: ['art'] }), 60)
  assert.equal(stopDurationFor({ category: 'activity', interests: ['history'] }), 60)
  assert.equal(stopDurationFor({ category: 'activity', interests: ['nature'] }), 60)
  // Longer: live music (90) and museums (120).
  assert.equal(stopDurationFor({ category: 'activity', interests: ['liveMusic'] }), 90)
  assert.equal(stopDurationFor({ category: 'activity', interests: ['museum'] }), 120)
  // no matching tag ⇒ activity category default (60)
  assert.equal(stopDurationFor({ category: 'activity', interests: ['unknownTag'] }), 60)
  // no interests at all ⇒ default, no crash
  assert.equal(stopDurationFor({ category: 'activity' }), 60)
  // first matching tag wins
  assert.equal(stopDurationFor({ category: 'activity', interests: ['nature', 'coffee'] }), 60)
})
