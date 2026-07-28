// Tests the AI branch of generateItinerary WITHOUT a live model, by injecting a
// fake callAI. The existing handoff/index tests only ever exercise the
// deterministic fallback (no key configured), so this is the one place the
// AI-succeeds and AI-output-rejected→fallback paths are actually covered.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { generateItinerary } from './index.js'

// A tiny shortlist the AI is asked to sequence. Coords/prices let the route
// optimizer + validator run for real; only the AI call itself is faked.
const SHORTLIST = [
  { id: 1, name: 'SFMOMA', category: 'activity', interests: ['art'], pricePerPerson: 10, latitude: 37.7857, longitude: -122.4011, openingHours: [{ open: '09:00', close: '18:00' }] },
  { id: 2, name: 'Golden Gate Park', category: 'activity', interests: ['nature'], pricePerPerson: 0, latitude: 37.7694, longitude: -122.4562, openingHours: [{ open: '09:00', close: '18:00' }] },
  { id: 10, name: 'La Taqueria', category: 'restaurant', cuisine: ['mexican'], pricePerPerson: 14, latitude: 37.7509, longitude: -122.4180, openingHours: [{ open: '11:00', close: '21:00' }] },
]
// Tight window (10:00-13:30) matching GOOD_REPLY's 2 stops so the coverage
// backstop doesn't trip. Test intent is "AI path works", not day-filling.
const CONSTRAINTS = {
  timeWindow: { startTime: '10:00', endTime: '13:30' },
  maxBudgetPerPerson: 90,
  groupSize: 2,
  transport: 'walking',
  includeMeals: false,
}

// A well-formed AI reply that sequences two shortlist pins within the window.
const GOOD_REPLY = {
  feasible: true,
  title: 'A Day in SF',
  location: 'San Francisco',
  description: 'Art then a taco.',
  stops: [
    { pinId: 1, arriveTime: '10:00', departTime: '11:30' },
    { pinId: 10, arriveTime: '12:00', departTime: '13:00', mealType: 'lunch' },
  ],
}

test('AI path: a valid reply is used and tagged source "ai"', async () => {
  const out = await generateItinerary(SHORTLIST, CONSTRAINTS, async () => GOOD_REPLY)
  assert.equal(out.source, 'ai')
  assert.ok(out.itinerary.stops.length >= 1)
  // Every stop references a real shortlist pin.
  const ids = new Set(SHORTLIST.map((p) => p.id))
  for (const s of out.itinerary.stops) assert.ok(ids.has(s.pinId))
})

test('AI path: a hallucinated pinId is rejected and falls back', async () => {
  const hallucinated = {
    ...GOOD_REPLY,
    stops: [{ pinId: 9999, arriveTime: '10:00', departTime: '11:00' }],
  }
  // Fallback needs a wider window for walking between these spread-out pins (~70-87
  // min travel). Tight CONSTRAINTS would trip coverage backstop. Test intent is
  // "hallucinated pinId → fallback works", not minimal-window edge case.
  const wideConstraints = { ...CONSTRAINTS, timeWindow: { startTime: '09:00', endTime: '18:00' } }
  const out = await generateItinerary(SHORTLIST, wideConstraints, async () => hallucinated)
  assert.equal(out.source, 'fallback')
  // The fallback only uses real shortlist pins.
  const ids = new Set(SHORTLIST.map((p) => p.id))
  for (const s of out.itinerary.stops) assert.ok(ids.has(s.pinId))
})

test('AI path: a thrown call (e.g. malformed JSON upstream) falls back', async () => {
  // Fallback needs room for walking; use wide window so coverage backstop doesn't trip.
  const wideConstraints = { ...CONSTRAINTS, timeWindow: { startTime: '09:00', endTime: '18:00' } }
  const out = await generateItinerary(SHORTLIST, wideConstraints, async () => {
    throw new Error('AI response had no message content')
  })
  assert.equal(out.source, 'fallback')
  assert.ok(out.itinerary.stops.length >= 1)
})

test('AI path: an over-budget reply is retried with feedback, then accepted', async () => {
  // Budget $15, grace $5 → limit $20. First reply totals $24 (past the grace so
  // it IS rejected → retry); the corrective retry returns a $14 day. Should end
  // as source "ai" with callAiFn invoked twice (original + corrective).
  const overBudget = {
    feasible: true, title: 'T', location: 'SF', description: 'D',
    stops: [
      { pinId: 1, arriveTime: '10:00', departTime: '11:30' }, // $10
      { pinId: 10, arriveTime: '12:00', departTime: '13:00', mealType: 'lunch' }, // $14 -> total 24 > 20 (past grace)
    ],
  }
  const inBudget = {
    feasible: true, title: 'T', location: 'SF', description: 'D',
    stops: [
      { pinId: 2, arriveTime: '10:00', departTime: '11:30' }, // $0
      { pinId: 10, arriveTime: '12:00', departTime: '13:00', mealType: 'lunch' }, // $14 -> total 14 <= 15
    ],
  }
  let calls = 0
  const callAiFn = async () => { calls++; return calls === 1 ? overBudget : inBudget }
  const tightBudget = { ...CONSTRAINTS, maxBudgetPerPerson: 15 }
  const out = await generateItinerary(SHORTLIST, tightBudget, callAiFn)
  assert.equal(calls, 2, 'should retry once with corrective feedback')
  assert.equal(out.source, 'ai')
  const ids = out.itinerary.stops.map((s) => s.pinId)
  assert.ok(!ids.includes(1), 'the $10 activity should be gone after the corrective retry')
})

test('AI path: if the corrective retry still fails, it falls back', async () => {
  const overBudget = {
    feasible: true, title: 'T', location: 'SF', description: 'D',
    stops: [
      { pinId: 1, arriveTime: '10:00', departTime: '11:30' },
      { pinId: 10, arriveTime: '12:00', departTime: '13:00', mealType: 'lunch' },
    ],
  }
  let calls = 0
  const callAiFn = async () => { calls++; return overBudget } // $24, never fixes it
  const tightBudget = { ...CONSTRAINTS, maxBudgetPerPerson: 15 } // grace $5 → limit $20 < 24
  const out = await generateItinerary(SHORTLIST, tightBudget, callAiFn)
  // 1 original + AI_VALIDATION_RETRIES corrective rounds (default 2) = 3 calls.
  assert.equal(calls, 3, 'tries original + corrective retries, then falls back')
  assert.equal(out.source, 'fallback')
})

test('AI path: an AI-declared infeasible result is returned as infeasible', async () => {
  const out = await generateItinerary(SHORTLIST, CONSTRAINTS, async () => ({
    feasible: false,
    reason: 'Budget too tight',
  }))
  assert.equal(out.feasible, false)
  assert.match(out.reason, /budget/i)
})
