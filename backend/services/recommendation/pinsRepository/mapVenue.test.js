import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapVenue } from './mapVenue.js'

// 2026-01-01 is a Thursday; 2026-01-04 is a Sunday. Used to pick the weekday.
const THU = '2026-01-01'
const SUN = '2026-01-04'

const base = {
  id: 1,
  name: 'Test Place',
  category: 'restaurant',
  tags: ['food', 'mexican'],
  interests: [],
  cuisines: ['mexican'],
  diets: [],
  rating: 4.5,
  pricePerPerson: 20,
  latitude: 37.76,
  longitude: -122.42,
  address: 'SF',
  locationImageUrl: null,
  hoursOpen: { mon: '08:00-22:00', tue: '08:00-22:00', wed: '08:00-22:00', thu: '08:00-22:00', fri: '08:00-22:00', sat: '08:00-22:00', sun: '08:00-22:00' },
}

// --- Issue 1: [] must become undefined (unknown), never [] ---

test('empty cuisines/diets/interests columns map to undefined, not []', () => {
  const r = mapVenue({ ...base, cuisines: [], diets: [], interests: [] }, THU)
  assert.equal(r.cuisine, undefined)
  assert.equal(r.diet, undefined)
  assert.equal(r.interests, undefined)
})

test('non-empty cuisines/diets pass through as arrays', () => {
  const r = mapVenue({ ...base, cuisines: ['mexican'], diets: ['vegan'] }, THU)
  assert.deepEqual(r.cuisine, ['mexican'])
  assert.deepEqual(r.diet, ['vegan'])
})

test('a diet-less restaurant reads as diet undefined so passesDiet keeps it', () => {
  // The exact hazard: a vegan group must not lose this pin just because its
  // diets column is [] (unknown), rather than a confirmed "serves no diets".
  const r = mapVenue({ ...base, diets: [] }, THU)
  assert.equal(r.diet, undefined)
})

// --- Issue 2: per-day hours from THIS pin's own hoursOpen (no shared default) ---

test('openingHours is the range for the trip weekday', () => {
  const r = mapVenue({ ...base, hoursOpen: { ...base.hoursOpen, thu: '09:00-17:00' } }, THU)
  assert.deepEqual(r.openingHours, [{ open: '09:00', close: '17:00' }])
})

test('a pin closed on the trip weekday yields null (caller hard-drops it)', () => {
  const r = mapVenue({ ...base, hoursOpen: { ...base.hoursOpen, sun: null } }, SUN)
  assert.equal(r.openingHours, null)
})

test('a pin with no hoursOpen at all yields undefined (unknown ⇒ keep)', () => {
  const r = mapVenue({ ...base, hoursOpen: null }, THU)
  assert.equal(r.openingHours, undefined)
})

test('two pins with different real hours get different results (no shared default)', () => {
  const early = mapVenue({ ...base, id: 1, hoursOpen: { ...base.hoursOpen, thu: '06:00-11:00' } }, THU)
  const late = mapVenue({ ...base, id: 2, hoursOpen: { ...base.hoursOpen, thu: '17:00-23:00' } }, THU)
  assert.deepEqual(early.openingHours, [{ open: '06:00', close: '11:00' }])
  assert.deepEqual(late.openingHours, [{ open: '17:00', close: '23:00' }])
})

// --- passthrough fields ---

test('passes through id/name/category/price/coords unchanged', () => {
  const r = mapVenue(base, THU)
  assert.equal(r.id, 1)
  assert.equal(r.name, 'Test Place')
  assert.equal(r.category, 'restaurant')
  assert.equal(r.pricePerPerson, 20)
  assert.equal(r.latitude, 37.76)
  assert.equal(r.longitude, -122.42)
})

test('does not expose legacy tags field', () => {
  const r = mapVenue(base, THU)
  assert.equal(r.tags, undefined)
})

test('exposes split fields (interests, cuisine, diet)', () => {
  const r = mapVenue({ ...base, interests: ['art'], cuisines: ['mexican'], diets: ['vegan'] }, THU)
  assert.deepEqual(r.interests, ['art'])
  assert.deepEqual(r.cuisine, ['mexican'])
  assert.deepEqual(r.diet, ['vegan'])
})
