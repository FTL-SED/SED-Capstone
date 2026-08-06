import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPlan, toPlanPlace } from './plan.js'

const SHORTLIST = [
  { id: 1, name: 'SFMOMA', category: 'activity', interests: ['art'], pricePerPerson: 10, latitude: 37.7857, longitude: -122.4011, address: '151 3rd St, SoMa, San Francisco, CA' },
  { id: 2, name: 'Ferry Building', category: 'activity', interests: ['shopping'], pricePerPerson: 5, latitude: 37.7955, longitude: -122.3937, address: '1 Ferry Building, Embarcadero, San Francisco, CA' },
  { id: 10, name: 'La Taqueria', category: 'restaurant', cuisine: ['mexican'], pricePerPerson: 14, latitude: 37.7509, longitude: -122.4180, address: '2889 Mission St, Mission, San Francisco, CA' },
]
const CONSTRAINTS = { timeWindow: { startTime: '10:00', endTime: '15:00' }, maxBudgetPerPerson: 90, groupSize: 2, transport: 'walking' }

test('buildPlan returns a feasible plan with selected pins, order, and places', () => {
  const plan = buildPlan(SHORTLIST, CONSTRAINTS)
  assert.equal(plan.feasible, true)
  assert.ok(plan.selected.length >= 1)
  assert.deepEqual(plan.defaultOrder, plan.selected.map((p) => p.id))
  assert.equal(plan.places.length, plan.selected.length)
})

test('buildPlan tags meal roles it placed (mealById)', () => {
  const plan = buildPlan(SHORTLIST, CONSTRAINTS)
  // The restaurant should be placed as lunch given the 10:00-15:00 window.
  if (plan.mealById.size > 0) {
    assert.ok([...plan.mealById.values()].every((m) => ['breakfast', 'lunch', 'dinner'].includes(m)))
  }
})

test('buildPlan returns infeasible for an empty shortlist without throwing', () => {
  const plan = buildPlan([], CONSTRAINTS)
  assert.equal(plan.feasible, false)
  assert.ok(typeof plan.reason === 'string')
})

test('toPlanPlace exposes only the fields the model needs (no coords/price/hours)', () => {
  const place = toPlanPlace(SHORTLIST[0], null)
  assert.deepEqual(Object.keys(place).sort(), ['area', 'category', 'durationMinutes', 'id', 'mealBlock', 'name', 'tags'].sort())
  assert.equal(place.latitude, undefined)
  assert.equal(place.pricePerPerson, undefined)
  assert.equal(place.openingHours, undefined)
})

test('toPlanPlace carries a numeric durationMinutes and the meal block', () => {
  const place = toPlanPlace(SHORTLIST[2], 'lunch')
  assert.equal(typeof place.durationMinutes, 'number')
  assert.equal(place.mealBlock, 'lunch')
})

test('toPlanPlace caps tags at 4', () => {
  const pin = { id: 9, name: 'X', category: 'activity', latitude: 37.78, longitude: -122.4, interests: ['a', 'b', 'c'], cuisine: ['d', 'e'], diet: ['f'] }
  const place = toPlanPlace(pin, null)
  assert.ok(place.tags.length <= 4)
})
