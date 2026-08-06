import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidOrder, resolveOrder, resolveNarration } from './narrate.js'

const DEFAULT = [1, 2, 10]

test('isValidOrder accepts a clean permutation of the selected ids', () => {
  assert.equal(isValidOrder([10, 1, 2], DEFAULT), true)
  assert.equal(isValidOrder([1, 2, 10], DEFAULT), true)
})

test('isValidOrder rejects wrong length, extras, missing, and dupes', () => {
  assert.equal(isValidOrder([1, 2], DEFAULT), false) // missing one
  assert.equal(isValidOrder([1, 2, 10, 99], DEFAULT), false) // extra
  assert.equal(isValidOrder([1, 2, 99], DEFAULT), false) // hallucinated
  assert.equal(isValidOrder([1, 1, 2], DEFAULT), false) // dup
  assert.equal(isValidOrder(undefined, DEFAULT), false)
  assert.equal(isValidOrder('nope', DEFAULT), false)
})

test('resolveOrder returns the model order when valid, else the default', () => {
  assert.deepEqual(resolveOrder({ order: [10, 1, 2] }, DEFAULT), [10, 1, 2])
  assert.equal(resolveOrder({ order: [99] }, DEFAULT), DEFAULT)
  assert.equal(resolveOrder(null, DEFAULT), DEFAULT)
})

test('resolveNarration uses model prose when present', () => {
  const out = resolveNarration(
    { title: 'My Day', description: 'Lovely.', notes: { 1: 'Great art.', 2: 'Nice views.' } },
    { fallbackTitle: 'FT', fallbackDescription: 'FD', fallbackLocation: 'SF' },
  )
  assert.equal(out.title, 'My Day')
  assert.equal(out.description, 'Lovely.')
  assert.equal(out.location, 'SF')
  assert.equal(out.notes.get(1), 'Great art.')
  assert.equal(out.notes.get(2), 'Nice views.')
})

test('resolveNarration falls back for missing/blank prose and null reply', () => {
  const defaults = { fallbackTitle: 'FT', fallbackDescription: 'FD', fallbackLocation: 'SF' }
  const out = resolveNarration(null, defaults)
  assert.equal(out.title, 'FT')
  assert.equal(out.description, 'FD')
  assert.equal(out.notes.size, 0)

  const blank = resolveNarration({ title: '  ', description: '' }, defaults)
  assert.equal(blank.title, 'FT')
  assert.equal(blank.description, 'FD')
})

test('resolveNarration sanitizes model prose (dashes → commas)', () => {
  const out = resolveNarration(
    { title: 'Art — and — tacos', description: 'D', notes: {} },
    { fallbackTitle: 'FT', fallbackDescription: 'FD', fallbackLocation: 'SF' },
  )
  assert.doesNotMatch(out.title, /—/)
})
