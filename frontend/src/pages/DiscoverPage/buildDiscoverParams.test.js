import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildDiscoverParams } from './buildDiscoverParams.js'

test('default feed: no query, no interests → clean public/recent params', () => {
  const params = buildDiscoverParams('', [], 'recent', 0, 20)
  assert.deepEqual(params, { scope: 'public', sort: 'recent', limit: 20, offset: 0 })
})

test('query only: includes trimmed q', () => {
  const params = buildDiscoverParams('  san fran  ', [], 'recent', 0, 20)
  assert.equal(params.q, 'san fran')
  assert.equal(params.interests, undefined)
})

test('blank/whitespace query is omitted', () => {
  const params = buildDiscoverParams('   ', [], 'recent', 0, 20)
  assert.equal(params.q, undefined)
})

test('interests only: comma-joined, no q', () => {
  const params = buildDiscoverParams('', ['art', 'museum'], 'recent', 0, 20)
  assert.equal(params.interests, 'art,museum')
  assert.equal(params.q, undefined)
})

test('empty interests array is omitted', () => {
  const params = buildDiscoverParams('beach', [], 'popular', 0, 20)
  assert.equal(params.interests, undefined)
})

test('query + interests + popular sort together', () => {
  const params = buildDiscoverParams('sf', ['nature'], 'popular', 0, 20)
  assert.deepEqual(params, {
    scope: 'public',
    sort: 'popular',
    limit: 20,
    offset: 0,
    q: 'sf',
    interests: 'nature',
  })
})

test('offset is passed through for pagination', () => {
  const params = buildDiscoverParams('', [], 'recent', 40, 20)
  assert.equal(params.offset, 40)
})
