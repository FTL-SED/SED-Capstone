import { test } from 'node:test'
import assert from 'node:assert/strict'

import { computePillView } from './pillView.js'

const OPTS = ['a', 'b', 'c', 'd', 'e'] // 5 options

test('no collapsedCount shows everything, no toggle', () => {
  const v = computePillView({ options: OPTS, selected: [], collapsedCount: undefined })
  assert.deepEqual(v.alwaysVisible, OPTS)
  assert.deepEqual(v.overflow, [])
  assert.equal(v.hasToggle, false)
})

test('collapsedCount >= length shows everything, no toggle', () => {
  const v = computePillView({ options: OPTS, selected: [], collapsedCount: 5 })
  assert.deepEqual(v.alwaysVisible, OPTS)
  assert.equal(v.hasToggle, false)
})

test('collapsed with none selected shows first N and overflows the rest', () => {
  const v = computePillView({ options: OPTS, selected: [], collapsedCount: 2 })
  assert.deepEqual(v.alwaysVisible, ['a', 'b'])
  assert.deepEqual(v.overflow, ['c', 'd', 'e'])
  assert.equal(v.hasToggle, true)
})

test('a selected pill beyond the cutoff is pinned into alwaysVisible', () => {
  const v = computePillView({ options: OPTS, selected: ['d'], collapsedCount: 2 })
  assert.deepEqual(v.alwaysVisible, ['a', 'b', 'd']) // top-2 + pinned selected, in options order
  assert.deepEqual(v.overflow, ['c', 'e'])           // still-hidden = unselected remainder
  assert.equal(v.hasToggle, true)
})

test('when every overflow option is selected, nothing is hidden and no toggle', () => {
  const v = computePillView({ options: OPTS, selected: ['c', 'd', 'e'], collapsedCount: 2 })
  assert.deepEqual(v.alwaysVisible, OPTS)
  assert.deepEqual(v.overflow, [])
  assert.equal(v.hasToggle, false)
})

test('selected pills already within the cutoff are not duplicated', () => {
  const v = computePillView({ options: OPTS, selected: ['a'], collapsedCount: 2 })
  assert.deepEqual(v.alwaysVisible, ['a', 'b'])
  assert.deepEqual(v.overflow, ['c', 'd', 'e'])
})
