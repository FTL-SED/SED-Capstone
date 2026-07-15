import { test } from 'node:test'
import assert from 'node:assert/strict'

import { enrichMissing } from './enrich.js'

test('enrichMissing is currently a no-op that returns the input unchanged', () => {
  const pins = [{ name: 'MoMA', category: 'museum' }]
  assert.deepEqual(enrichMissing(pins), pins)
})

test('enrichMissing does not mutate its input', () => {
  const pins = [{ name: 'MoMA', category: 'museum' }]
  const snapshot = JSON.parse(JSON.stringify(pins))
  enrichMissing(pins)
  assert.deepEqual(pins, snapshot)
})
