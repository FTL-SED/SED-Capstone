// Tests the AI branch of generateItinerary WITHOUT a live model, by injecting a
// fake narrator reply. In the scheduler+narrator design the model only supplies
// an ORDER + prose; the backend selects the day and computes all times, so these
// assert: a good reply's order/prose is used (source "ai"); a bad/missing reply
// falls back to the deterministic order (source "deterministic") but still yields
// a valid, fully-timed day.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { generateItinerary } from './index.js'

// A small shortlist the backend will select from. Coords/prices let selection +
// the route optimizer + scheduler run for real; only the narrator call is faked.
const SHORTLIST = [
  { id: 1, name: 'SFMOMA', category: 'activity', interests: ['art'], pricePerPerson: 10, latitude: 37.7857, longitude: -122.4011, address: '151 3rd St, SoMa, San Francisco, CA', openingHours: [{ open: '09:00', close: '18:00' }] },
  { id: 2, name: 'Golden Gate Park', category: 'activity', interests: ['nature'], pricePerPerson: 0, latitude: 37.7694, longitude: -122.4562, address: '501 Stanyan St, Golden Gate Park, San Francisco, CA', openingHours: [{ open: '09:00', close: '18:00' }] },
  { id: 10, name: 'La Taqueria', category: 'restaurant', cuisine: ['mexican'], pricePerPerson: 14, latitude: 37.7509, longitude: -122.4180, address: '2889 Mission St, Mission, San Francisco, CA', openingHours: [{ open: '11:00', close: '21:00' }] },
]
const CONSTRAINTS = {
  timeWindow: { startTime: '10:00', endTime: '15:00' },
  maxBudgetPerPerson: 90,
  groupSize: 2,
  transport: 'walking',
}

const idsOf = (itin) => itin.stops.map((s) => s.pinId)

// An all-activity selection (includeMeals:false) so any permutation the model
// returns schedules validly — isolates "the model's order is used" from
// meal-window feasibility (a meal placed first would be held to its window,
// which the pipeline correctly rejects — covered by the fallback tests below).
const ACTIVITIES = [
  { id: 1, name: 'SFMOMA', category: 'activity', interests: ['art'], pricePerPerson: 10, latitude: 37.7857, longitude: -122.4011, address: '151 3rd St, SoMa, San Francisco, CA' },
  { id: 2, name: 'Ferry Building', category: 'activity', interests: ['shopping'], pricePerPerson: 5, latitude: 37.7955, longitude: -122.3937, address: '1 Ferry Building, Embarcadero, San Francisco, CA' },
  { id: 3, name: 'Coit Tower', category: 'activity', interests: ['scenic_views'], pricePerPerson: 10, latitude: 37.8024, longitude: -122.4058, address: '1 Telegraph Hill Blvd, North Beach, San Francisco, CA' },
]
const NO_MEALS = { ...CONSTRAINTS, includeMeals: false }

test('AI path: a valid order + prose is used and tagged source "ai"', async () => {
  const reply = (messages) => {
    const user = messages.find((m) => m.role === 'user').content
    const ids = [...user.matchAll(/"id":(\d+)/g)].map((m) => Number(m[1]))
    return {
      title: 'A Sightseeing Day',
      description: 'A relaxed SF day.',
      order: [...ids].reverse(), // a valid permutation, distinct from default
      notes: Object.fromEntries(ids.map((id) => [id, `Stop ${id} is great.`])),
    }
  }
  const out = await generateItinerary(ACTIVITIES, NO_MEALS, async (m) => reply(m))
  assert.equal(out.source, 'ai')
  assert.equal(out.itinerary.title, 'A Sightseeing Day')
  // Every scheduled stop references a selected pin and carries assigned times.
  const ids = new Set(ACTIVITIES.map((p) => p.id))
  for (const s of out.itinerary.stops) {
    assert.ok(ids.has(s.pinId))
    assert.match(s.arriveTime, /^\d{2}:\d{2}$/)
    assert.match(s.departTime, /^\d{2}:\d{2}$/)
  }
})

test('AI path: a null reply (timeout) falls back to the deterministic order', async () => {
  const out = await generateItinerary(SHORTLIST, CONSTRAINTS, async () => {
    throw new Error('Request timed out.')
  })
  assert.equal(out.source, 'deterministic')
  assert.ok(out.itinerary.stops.length >= 1)
  const ids = new Set(SHORTLIST.map((p) => p.id))
  for (const s of out.itinerary.stops) assert.ok(ids.has(s.pinId))
})

test('AI path: a bad order (hallucinated / incomplete) falls back to deterministic', async () => {
  const out = await generateItinerary(SHORTLIST, CONSTRAINTS, async () => ({
    title: 'T', description: 'D',
    order: [9999], // not a permutation of the selected ids
    notes: {},
  }))
  assert.equal(out.source, 'deterministic')
  // Still a valid, fully-timed day from the deterministic order.
  const ids = new Set(SHORTLIST.map((p) => p.id))
  for (const s of out.itinerary.stops) assert.ok(ids.has(s.pinId))
})

test('AI path: prose is taken from the model even when the order is defaulted', async () => {
  const out = await generateItinerary(SHORTLIST, CONSTRAINTS, async () => ({
    title: 'Custom Title',
    description: 'Custom description.',
    order: [1], // invalid → deterministic order, but prose should still apply
    notes: {},
  }))
  assert.equal(out.source, 'deterministic')
  assert.equal(out.itinerary.title, 'Custom Title')
  assert.equal(out.itinerary.description, 'Custom description.')
})

test('AI path: the model never adds or drops a place — schedule uses only selected pins', async () => {
  const out = await generateItinerary(SHORTLIST, CONSTRAINTS, async () => ({
    title: 'T', description: 'D',
    order: [1, 2, 10, 9999], // extra id — rejected, order defaulted
    notes: {},
  }))
  const scheduled = new Set(idsOf(out.itinerary))
  for (const id of scheduled) assert.ok(SHORTLIST.some((p) => p.id === id))
})

test('AI path: an infeasible selection is returned as infeasible (no model call)', async () => {
  let called = false
  const out = await generateItinerary(
    [],
    CONSTRAINTS,
    async () => { called = true; return {} },
  )
  assert.equal(out.feasible, false)
  assert.equal(called, false, 'model must not be called when selection is infeasible')
})
