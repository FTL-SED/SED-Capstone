import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emptyToUndefined } from './tagVocab.js'

test('emptyToUndefined: a non-empty array passes through unchanged', () => {
  const arr = ['vegan', 'vegetarian']
  assert.equal(emptyToUndefined(arr), arr)
})

test('emptyToUndefined: an empty array becomes undefined (unknown, not "none")', () => {
  assert.equal(emptyToUndefined([]), undefined)
})

test('emptyToUndefined: null/undefined input becomes undefined', () => {
  assert.equal(emptyToUndefined(null), undefined)
  assert.equal(emptyToUndefined(undefined), undefined)
})
