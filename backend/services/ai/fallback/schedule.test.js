import { test } from 'node:test'
import assert from 'node:assert/strict'

import { rescheduleStops } from './schedule.js'

const coords = {
  1: { latitude: 37.7955, longitude: -122.3937 },
  2: { latitude: 37.7614, longitude: -122.4241 },
  3: { latitude: 37.7694, longitude: -122.4862 },
}
const coordOf = (stop) => coords[stop.pinId]

const stop = (pinId, arriveTime, departTime, extra = {}) => ({
  pinId, arriveTime, departTime, ...extra,
})

test('first stop arrives at the provided start time', () => {
  const stops = [stop(1, '10:00', '11:00'), stop(2, '11:30', '12:30')]
  const out = rescheduleStops(stops, coordOf, '09:00')
  assert.equal(out[0].arriveTime, '09:00')
})

test('preserves each stop dwell duration', () => {
  const stops = [stop(1, '10:00', '11:30'), stop(2, '12:00', '12:45')] // 90m, 45m
  const out = rescheduleStops(stops, coordOf, '09:00')
  const dwell = (s) => {
    const [ah, am] = s.arriveTime.split(':').map(Number)
    const [dh, dm] = s.departTime.split(':').map(Number)
    return dh * 60 + dm - (ah * 60 + am)
  }
  assert.equal(dwell(out[0]), 90)
  assert.equal(dwell(out[1]), 45)
})

test('leaves a travel gap between consecutive stops (arrive > previous depart)', () => {
  const stops = [stop(1, '09:00', '10:00'), stop(3, '10:00', '11:00')] // 1 & 3 are far apart
  const out = rescheduleStops(stops, coordOf, '09:00')
  const departPrev = out[0].departTime
  assert.ok(out[1].arriveTime > departPrev, 'second stop should arrive after travel time')
})

test('transport mode scales travel time: walking takes longer than driving', () => {
  const stops = [stop(1, '09:00', '10:00'), stop(3, '10:00', '11:00')] // pins 1 & 3 far apart
  const walk = rescheduleStops(stops, coordOf, '09:00', 'walking')
  const drive = rescheduleStops(stops, coordOf, '09:00', 'driving')
  assert.ok(
    walk[0].travelTimeToNextMinutes > drive[0].travelTimeToNextMinutes,
    `walking (${walk[0].travelTimeToNextMinutes}m) should exceed driving (${drive[0].travelTimeToNextMinutes}m)`
  )
})

test('produces chronological, non-overlapping times', () => {
  const stops = [stop(1, '09:00', '10:00'), stop(2, '10:00', '11:00'), stop(3, '11:00', '12:00')]
  const out = rescheduleStops(stops, coordOf, '09:00')
  for (let i = 1; i < out.length; i++) {
    assert.ok(out[i].arriveTime >= out[i - 1].departTime)
  }
})

test('backfills travel legs on all but the last stop; last has none', () => {
  const stops = [stop(1, '09:00', '10:00'), stop(2, '10:30', '11:30'), stop(3, '12:00', '13:00')]
  const out = rescheduleStops(stops, coordOf, '09:00')
  assert.equal(typeof out[0].travelTimeToNextMinutes, 'number')
  assert.equal(typeof out[0].distanceToNextMeters, 'number')
  assert.equal(out[out.length - 1].travelTimeToNextMinutes, null)
  assert.equal(out[out.length - 1].distanceToNextMeters, null)
})

test('preserves non-timing fields (mealType, note)', () => {
  const stops = [stop(1, '12:00', '13:00', { mealType: 'lunch', note: 'hi' })]
  const out = rescheduleStops(stops, coordOf, '12:00')
  assert.equal(out[0].mealType, 'lunch')
  assert.equal(out[0].note, 'hi')
})

test('holds a meal that would arrive early until its window opens', () => {
  // Only stop, day starts 09:00 — without a hold, a dinner would arrive 09:00,
  // outside the dinner window. It should be delayed to the window's start
  // (17:00) instead.
  const stops = [stop(1, '18:00', '19:30', { mealType: 'dinner' })]
  const out = rescheduleStops(stops, coordOf, '09:00')
  assert.equal(out[0].arriveTime, '17:00', 'dinner should wait for its window to open')
  assert.equal(out[0].departTime, '18:30', 'dwell (90m) is preserved from the delayed arrival')
})

test('does not delay a meal that already arrives within its window', () => {
  // A short earlier stop means we reach the lunch stop at ~10:04 naturally, but
  // the natural clock still puts it well inside lunch (11:30-13:30) here.
  const stops = [
    stop(1, '11:45', '12:00'),
    stop(2, '12:15', '13:00', { mealType: 'lunch' }),
  ]
  const out = rescheduleStops(stops, coordOf, '11:45')
  // Natural arrival (12:00 depart + travel) is already inside lunch — not
  // pushed to the block start (11:30).
  assert.ok(out[1].arriveTime >= '11:30' && out[1].arriveTime <= '13:30')
  assert.notEqual(out[1].arriveTime, '11:30')
})
