import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTag, acceptedTags, CUISINES, DIETS, INTERESTS } from './tagVocab.js'

test('normalizeTag: a canonical value maps to itself', () => {
  assert.equal(normalizeTag('cuisine', 'mexican'), 'mexican')
  assert.equal(normalizeTag('diet', 'vegan'), 'vegan')
  assert.equal(normalizeTag('interest', 'museums'), 'museums')
})

test('normalizeTag: a known variant maps to its canonical', () => {
  assert.equal(normalizeTag('cuisine', 'tex-mex'), 'mexican')
  assert.equal(normalizeTag('interest', 'jazz'), 'liveMusic')
  assert.equal(normalizeTag('interest', 'viewpoints'), 'scenic')
  assert.equal(normalizeTag('diet', 'gf'), 'gluten-free')
})

test('normalizeTag: case-insensitive and trims whitespace', () => {
  assert.equal(normalizeTag('cuisine', '  Mexican '), 'mexican')
  assert.equal(normalizeTag('interest', 'FARMERS MARKET'), 'markets')
})

test('normalizeTag: an unrecognized tag returns null', () => {
  assert.equal(normalizeTag('cuisine', 'klingon'), null)
  assert.equal(normalizeTag('interest', ''), null)
})

test('normalizeTag: an unknown bucket or non-string returns null', () => {
  assert.equal(normalizeTag('nope', 'mexican'), null)
  assert.equal(normalizeTag('cuisine', 42), null)
})

test('acceptedTags: returns the canonical keys of a bucket', () => {
  assert.deepEqual(acceptedTags('cuisine'), Object.keys(CUISINES))
  assert.deepEqual(acceptedTags('diet'), Object.keys(DIETS))
  assert.deepEqual(acceptedTags('interest'), Object.keys(INTERESTS))
  assert.deepEqual(acceptedTags('nope'), [])
})
