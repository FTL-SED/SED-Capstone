import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDayHours, dayKeyFromDate } from './hours.js'

test('parseDayHours: a day with a range → interval array', () => {
  const hours = { mon: '08:00-22:00' }
  assert.deepEqual(parseDayHours(hours, 'mon'), [{ open: '08:00', close: '22:00' }])
})

test('parseDayHours: a day explicitly null → null (closed)', () => {
  assert.equal(parseDayHours({ sun: null }, 'sun'), null)
})

test('parseDayHours: unknown when hoursOpen is missing → undefined', () => {
  assert.equal(parseDayHours(null, 'mon'), undefined)
  assert.equal(parseDayHours(undefined, 'mon'), undefined)
})

test('parseDayHours: unknown when the day key is absent → undefined', () => {
  assert.equal(parseDayHours({ mon: '08:00-22:00' }, 'tue'), undefined)
})

test('parseDayHours: malformed range → undefined (treat as unknown)', () => {
  assert.equal(parseDayHours({ mon: 'not-a-range' }, 'mon'), undefined)
})

test('dayKeyFromDate: maps a date to its weekday key', () => {
  // 2026-01-01 is a Thursday
  assert.equal(dayKeyFromDate('2026-01-01'), 'thu')
})
