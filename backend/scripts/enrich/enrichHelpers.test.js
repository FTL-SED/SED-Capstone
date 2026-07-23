// backend/scripts/enrich/enrichHelpers.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterToVocab, collectProposed, resolveDescription, tallyProposed } from './enrichHelpers.js'

const ALLOWED = ['coffee', 'food', 'art']

test('filterToVocab keeps only allowed tags', () => {
  assert.deepEqual(filterToVocab(['coffee', 'brewery', 'art'], ALLOWED), ['coffee', 'art'])
  assert.deepEqual(filterToVocab(undefined, ALLOWED), [])
})

test('collectProposed returns only out-of-vocab tags', () => {
  assert.deepEqual(collectProposed(['coffee', 'brewery', 'speakeasy'], ALLOWED), ['brewery', 'speakeasy'])
})

test('resolveDescription uses the AI text when confidence is known', () => {
  assert.equal(
    resolveDescription('  Historic ferry terminal turned food hall.  ', 'known', { category: 'activity' }),
    'Historic ferry terminal turned food hall.')
})

test('resolveDescription falls back to a generic, non-fabricated line otherwise', () => {
  assert.equal(resolveDescription('', 'generic', { category: 'restaurant' }), 'A place to eat in San Francisco.')
  assert.equal(resolveDescription('anything', 'lowconf', { category: 'activity' }), 'A spot to visit in San Francisco.')
})

test('tallyProposed counts occurrences and caps examples at 3', () => {
  const m = new Map()
  tallyProposed(m, ['brewery'], 'A'); tallyProposed(m, ['brewery'], 'B')
  tallyProposed(m, ['brewery'], 'C'); tallyProposed(m, ['brewery'], 'D')
  assert.equal(m.get('brewery').count, 4)
  assert.deepEqual(m.get('brewery').examples, ['A', 'B', 'C'])
})
