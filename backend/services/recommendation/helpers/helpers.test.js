import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  shareTag,
  overlap,
  passesDiet,
  estPricePerPerson,
  budgetSanityOk,
  isOpenInWindow,
} from './helpers.js'

test('shareTag: true when a pin tag is in the group set', () => {
  assert.equal(shareTag(['museum', 'art'], new Set(['art', 'coffee'])), true)
})

test('shareTag: false with no overlap', () => {
  assert.equal(shareTag(['museum'], new Set(['coffee'])), false)
})

test('shareTag: false/empty when pin has no tags (missing data)', () => {
  assert.equal(shareTag([], new Set(['art'])), false)
  assert.equal(shareTag(undefined, new Set(['art'])), false)
})

test('overlap: true when cuisine matches a food pref', () => {
  assert.equal(overlap(['sushi', 'ramen'], ['sushi']), true)
})

test('overlap: false with no match', () => {
  assert.equal(overlap(['pizza'], ['sushi']), false)
})

test('overlap: false when cuisine or prefs missing (missing data)', () => {
  assert.equal(overlap(undefined, ['sushi']), false)
  assert.equal(overlap(['sushi'], []), false)
})

test('passesDiet: true when no dietary needs in the group', () => {
  const members = [{ name: 'A' }, { name: 'B', diet: [] }]
  assert.equal(passesDiet({ diet: ['vegan'] }, members), true)
})

test('passesDiet: true only when pin serves every required diet', () => {
  const members = [{ name: 'A', diet: ['vegetarian'] }]
  assert.equal(passesDiet({ diet: ['vegetarian', 'vegan'] }, members), true)
  assert.equal(passesDiet({ diet: ['vegan'] }, members), false)
})

test('passesDiet: keeps pin when its diet data is unknown (missing data)', () => {
  const members = [{ name: 'A', diet: ['vegan'] }]
  assert.equal(passesDiet({ name: 'Mystery Cafe' }, members), true)
})

test('estPricePerPerson: maps priceLevel via the table', () => {
  assert.equal(estPricePerPerson({ priceLevel: 2 }), 22)
  assert.equal(estPricePerPerson({ priceLevel: 0 }), 0)
})

test('estPricePerPerson: null when priceLevel missing (missing data)', () => {
  assert.equal(estPricePerPerson({}), null)
})

test('estPricePerPerson: prefers an already-known exact price over priceLevel', () => {
  assert.equal(estPricePerPerson({ pricePerPerson: 18.5, priceLevel: 4 }), 18.5)
  assert.equal(estPricePerPerson({ pricePerPerson: 0 }), 0) // falsy but known, must not fall through
})

test('budgetSanityOk: drops only when one visit exceeds the whole budget', () => {
  assert.equal(budgetSanityOk({ priceLevel: 4 }, { maxBudgetPerPerson: 50 }), false) // 80 > 50
  assert.equal(budgetSanityOk({ priceLevel: 2 }, { maxBudgetPerPerson: 50 }), true) // 22 <= 50
})

test('budgetSanityOk: keeps pin when price unknown (missing data)', () => {
  assert.equal(budgetSanityOk({}, { maxBudgetPerPerson: 10 }), true)
})

test('isOpenInWindow: true when hours overlap the trip window', () => {
  const pin = { openingHours: [{ open: '09:00', close: '17:00' }] }
  assert.equal(isOpenInWindow(pin, '10:00', '12:00'), true)
})

test('isOpenInWindow: false when hours fall entirely outside the window', () => {
  const pin = { openingHours: [{ open: '18:00', close: '23:00' }] }
  assert.equal(isOpenInWindow(pin, '09:00', '17:00'), false)
})

test('isOpenInWindow: keeps pin when hours unknown (missing data)', () => {
  assert.equal(isOpenInWindow({}, '09:00', '17:00'), true)
  assert.equal(isOpenInWindow({ openingHours: [] }, '09:00', '17:00'), true)
})
