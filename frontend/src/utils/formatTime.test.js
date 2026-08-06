import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime12h } from './formatTime.js';

test('formats morning and afternoon 24h times as 12h am/pm', () => {
  assert.equal(formatTime12h('12:00'), '12:00 PM'); // noon
  assert.equal(formatTime12h('17:00'), '5:00 PM');
  assert.equal(formatTime12h('09:30'), '9:30 AM');
  assert.equal(formatTime12h('00:00'), '12:00 AM'); // midnight
  assert.equal(formatTime12h('23:45'), '11:45 PM');
});

test('pads minutes and drops the leading zero on the hour', () => {
  assert.equal(formatTime12h('08:05'), '8:05 AM');
});

test('returns empty string for blank input', () => {
  assert.equal(formatTime12h(''), '');
  assert.equal(formatTime12h(undefined), '');
  assert.equal(formatTime12h(null), '');
});

test('returns the original for an unparseable value rather than "NaN"', () => {
  assert.equal(formatTime12h('not-a-time'), 'not-a-time');
});
