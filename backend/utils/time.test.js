import { test } from 'node:test'
import assert from 'node:assert/strict'

import { toMinutes, toHHMM, windowLengthMinutes, minutesFromStart } from './time.js'

test('toMinutes: HH:MM -> minutes since midnight', () => {
  assert.equal(toMinutes('00:00'), 0)
  assert.equal(toMinutes('09:00'), 540)
  assert.equal(toMinutes('14:30'), 870)
  assert.equal(toMinutes('23:59'), 1439)
})

test('toHHMM: minutes -> HH:MM, wrapping past midnight', () => {
  assert.equal(toHHMM(540), '09:00')
  assert.equal(toHHMM(870), '14:30')
  assert.equal(toHHMM(0), '00:00')
  // Overnight: an elapsed clock past 24h wraps back to wall-clock.
  assert.equal(toHHMM(1440), '00:00') // exactly midnight
  assert.equal(toHHMM(1500), '01:00') // 25:00 -> 01:00
  assert.equal(toHHMM(1590), '02:30')
})

test('windowLengthMinutes: same-day and cross-midnight', () => {
  assert.equal(windowLengthMinutes('09:00', '18:00'), 540) // same day
  assert.equal(windowLengthMinutes('22:00', '02:00'), 240) // crosses midnight
  assert.equal(windowLengthMinutes('23:00', '00:30'), 90)
  assert.equal(windowLengthMinutes('00:00', '23:59'), 1439)
})

test('minutesFromStart: same-day trip is unchanged (no wrap)', () => {
  assert.equal(minutesFromStart('09:00', '09:00'), 0)
  assert.equal(minutesFromStart('09:00', '10:00'), 60)
  assert.equal(minutesFromStart('09:00', '18:00'), 540)
})

test('minutesFromStart: overnight trip sorts after-midnight times AFTER the evening', () => {
  // Trip starts 22:00.
  assert.equal(minutesFromStart('22:00', '22:00'), 0)
  assert.equal(minutesFromStart('22:00', '23:30'), 90)
  assert.equal(minutesFromStart('22:00', '00:30'), 150) // past midnight → later, not earlier
  assert.equal(minutesFromStart('22:00', '02:00'), 240)
  // Ordering holds: a 00:30 stop is later than a 23:00 stop on this trip.
  assert.ok(minutesFromStart('22:00', '00:30') > minutesFromStart('22:00', '23:00'))
})
