import { test } from 'node:test'
import assert from 'node:assert/strict'

import { enrichMissing } from './enrich.js'

test('enrichMissing is currently a no-op that returns the input unchanged', () => {
  const places = [{ name: 'MoMA', category: 'museum' }]
  assert.deepEqual(enrichMissing(places), places)
})

test('enrichMissing does not mutate its input', () => {
  const places = [{ name: 'MoMA', category: 'museum' }]
  const snapshot = JSON.parse(JSON.stringify(places))
  enrichMissing(places)
  assert.deepEqual(places, snapshot)
})
