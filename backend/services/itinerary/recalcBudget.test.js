import test from 'node:test'
import assert from 'node:assert/strict'
import { sumStopCosts } from './recalcBudget.js'

test('sumStopCosts uses the stop override when set', () => {
  const stops = [
    { costPerPerson: 10, pin: { pricePerPerson: 99 } },
    { costPerPerson: 5, pin: { pricePerPerson: 99 } },
  ]
  assert.equal(sumStopCosts(stops), 15)
})

test('sumStopCosts falls back to the venue price when no override', () => {
  const stops = [
    { costPerPerson: null, pin: { pricePerPerson: 20 } },
    { costPerPerson: 8, pin: { pricePerPerson: 99 } },
  ]
  assert.equal(sumStopCosts(stops), 28)
})

test('sumStopCosts treats a missing price as 0', () => {
  const stops = [
    { costPerPerson: null, pin: {} },
    { costPerPerson: null, pin: { pricePerPerson: 12 } },
  ]
  assert.equal(sumStopCosts(stops), 12)
})

test('sumStopCosts of no stops is 0', () => {
  assert.equal(sumStopCosts([]), 0)
})
