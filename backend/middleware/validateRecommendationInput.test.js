import { test } from 'node:test'
import assert from 'node:assert/strict'

import { validateRecommendationInput } from './validateRecommendationInput.js'

// Minimal Express req/res doubles: res records the status + JSON body, and
// next() records that it was called. validateRecommendationInput either sends a
// 400 or calls next() — never both.
function run(body) {
  const req = { body }
  let sent = null
  const res = {
    status(code) {
      this._code = code
      return this
    },
    json(payload) {
      sent = { code: this._code, body: payload }
      return this
    },
  }
  let nextCalled = false
  validateRecommendationInput(req, res, () => {
    nextCalled = true
  })
  return { sent, nextCalled, req }
}

const validTrip = { startTime: '09:00', endTime: '18:00', maxBudgetPerPerson: 60 }
const validMember = {
  name: 'Alex',
  startLocation: { latitude: 37.7749, longitude: -122.4194 },
  interestTags: ['art'],
}

test('passes a well-formed payload with coordinate startLocations', () => {
  const { sent, nextCalled } = run({ trip: validTrip, members: [validMember] })
  assert.equal(sent, null)
  assert.equal(nextCalled, true)
})

test('accepts an optional positive travelRadius', () => {
  const { nextCalled } = run({
    trip: { ...validTrip, travelRadius: 5 },
    members: [validMember],
  })
  assert.equal(nextCalled, true)
})

test('rejects a non-positive travelRadius', () => {
  const { sent, nextCalled } = run({
    trip: { ...validTrip, travelRadius: 0 },
    members: [validMember],
  })
  assert.equal(nextCalled, false)
  assert.equal(sent.code, 400)
  assert.match(sent.body.error, /travelRadius/)
})

test('rejects a string startLocation (address text is not accepted — coords only)', () => {
  const { sent, nextCalled } = run({
    trip: validTrip,
    members: [{ name: 'Alex', startLocation: 'Downtown', interestTags: ['art'] }],
  })
  assert.equal(nextCalled, false)
  assert.equal(sent.code, 400)
  assert.match(sent.body.error, /startLocation/)
})

test('rejects a missing startLocation', () => {
  const { sent, nextCalled } = run({
    trip: validTrip,
    members: [{ name: 'Alex', interestTags: ['art'] }],
  })
  assert.equal(nextCalled, false)
  assert.equal(sent.code, 400)
  assert.match(sent.body.error, /startLocation/)
})

test('rejects out-of-range coordinates', () => {
  const { sent, nextCalled } = run({
    trip: validTrip,
    members: [{ name: 'Alex', startLocation: { latitude: 200, longitude: -122.4 } }],
  })
  assert.equal(nextCalled, false)
  assert.equal(sent.code, 400)
  assert.match(sent.body.error, /startLocation/)
})

test('rejects an empty members array', () => {
  const { sent, nextCalled } = run({ trip: validTrip, members: [] })
  assert.equal(nextCalled, false)
  assert.equal(sent.code, 400)
  assert.match(sent.body.error, /members/)
})

test('rejects a bad trip time', () => {
  const { sent, nextCalled } = run({
    trip: { ...validTrip, startTime: '25:99' },
    members: [validMember],
  })
  assert.equal(nextCalled, false)
  assert.equal(sent.code, 400)
  assert.match(sent.body.error, /startTime/)
})

test('rejects endTime equal to startTime (zero-length / ambiguous window)', () => {
  const equal = run({ trip: { ...validTrip, startTime: '12:00', endTime: '12:00' }, members: [validMember] })
  assert.equal(equal.nextCalled, false)
  assert.equal(equal.sent.code, 400)
  assert.match(equal.sent.body.error, /must differ/)
})

test('accepts an overnight window where endTime < startTime (crosses midnight)', () => {
  // A late-night plan 22:00 → 02:00: the engine anchors on startTime, so this
  // is a valid 4-hour window rather than an error.
  const { sent, nextCalled } = run({
    trip: { ...validTrip, startTime: '22:00', endTime: '02:00' },
    members: [validMember],
  })
  assert.equal(sent, null)
  assert.equal(nextCalled, true)
})

test('each member keeps its own independent prefs', () => {
  const members = [
    { name: 'Ana', startLocation: { latitude: 37.7749, longitude: -122.4194 }, interestTags: ['art'], foodPrefs: ['italian'] },
    { name: 'Ben', startLocation: { latitude: 37.8044, longitude: -122.2712 }, interestTags: ['hiking'], diet: ['vegan'] },
  ]
  const { sent, nextCalled } = run({ trip: validTrip, members })
  assert.equal(sent, null)
  assert.equal(nextCalled, true)
})

test('rejects a member with a non-string-array pref', () => {
  const { sent, nextCalled } = run({
    trip: validTrip,
    members: [{ name: 'Ana', startLocation: { latitude: 37.77, longitude: -122.41 }, interestTags: [1, 2] }],
  })
  assert.equal(nextCalled, false)
  assert.equal(sent.code, 400)
  assert.match(sent.body.error, /interestTags/)
})

test('accepts a known transport mode and rejects an unknown one', () => {
  const ok = run({ trip: { ...validTrip, transport: 'walking' }, members: [validMember] })
  assert.equal(ok.nextCalled, true)
  assert.equal(ok.sent, null)

  const bad = run({ trip: { ...validTrip, transport: 'teleport' }, members: [validMember] })
  assert.equal(bad.nextCalled, false)
  assert.equal(bad.sent.code, 400)
  assert.match(bad.sent.body.error, /transport must be one of/)
})
