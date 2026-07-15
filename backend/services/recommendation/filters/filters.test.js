import { test } from 'node:test'
import assert from 'node:assert/strict'

import { hardFilter } from './filters.js'

// A group that likes art + coffee, one vegan member, a generous budget and a
// wide daytime window — the baseline most tests tweak one pin against.
const members = [
  { name: 'A', interestTags: ['art', 'museum'], foodPrefs: ['sushi'], diet: ['vegan'] },
  { name: 'B', interestTags: ['coffee'], foodPrefs: ['ramen'] },
]
const trip = { startTime: '09:00', endTime: '18:00', maxBudgetPerPerson: 60 }

const run = (pins) => hardFilter(pins, members, trip)

test('keeps an activity that overlaps a group interest', () => {
  const { candidates } = run([{ name: 'MoMA', category: 'museum', tags: ['art'] }])
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].name, 'MoMA')
})

test('drops an activity with zero interest overlap (pure noise)', () => {
  const { candidates } = run([{ name: 'Skate Park', category: 'park', tags: ['skating'] }])
  assert.equal(candidates.length, 0)
})

test('restaurants are always eligible even without an interest tag overlap', () => {
  const { candidates } = run([
    { name: 'Ramen Bar', category: 'restaurant', tags: [], cuisine: ['ramen'] },
  ])
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].name, 'Ramen Bar')
})

test('drops a restaurant that cannot serve a required diet', () => {
  const { candidates } = run([
    { name: 'Steakhouse', category: 'restaurant', tags: [], cuisine: ['steak'], diet: ['vegetarian'] },
  ])
  assert.equal(candidates.length, 0)
})

test('drops a pin whose per-person price alone exceeds the budget', () => {
  const { candidates } = run([
    { name: 'Fancy Tasting', category: 'restaurant', tags: [], priceLevel: 4 }, // $80 > $60
  ])
  assert.equal(candidates.length, 0)
})

test('keeps a pin with unknown price and flags it (missing data)', () => {
  const { candidates, flags } = run([
    { name: 'Mystery Cafe', category: 'coffee', tags: ['coffee'] },
  ])
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].priceUnknown, true)
  assert.deepEqual(flags.priceUnknown, ['Mystery Cafe'])
})

test('drops a pin whose known hours fall entirely outside the window', () => {
  const { candidates } = run([
    { name: 'Night Gallery', category: 'museum', tags: ['art'], openingHours: [{ open: '20:00', close: '23:00' }] },
  ])
  assert.equal(candidates.length, 0)
})

test('keeps a pin whose known hours overlap the window without flagging', () => {
  const { candidates } = run([
    { name: 'Day Gallery', category: 'museum', tags: ['art'], priceLevel: 1, openingHours: [{ open: '10:00', close: '17:00' }] },
  ])
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].hoursUnknown, false)
  assert.equal(candidates[0].priceUnknown, false)
})

test('keeps a pin with unknown hours and flags it (missing data)', () => {
  const { candidates, flags } = run([
    { name: 'Old Museum', category: 'museum', tags: ['art'], priceLevel: 2 },
  ])
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].hoursUnknown, true)
  assert.deepEqual(flags.hoursUnknown, ['Old Museum'])
})

test('returns { candidates, flags } and does not mutate the input pins', () => {
  const pins = [{ name: 'MoMA', category: 'museum', tags: ['art'] }]
  const result = run(pins)
  assert.ok(Array.isArray(result.candidates))
  assert.ok(result.flags && Array.isArray(result.flags.priceUnknown))
  assert.equal('priceUnknown' in pins[0], false) // original untouched
})
