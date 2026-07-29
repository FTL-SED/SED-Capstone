import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterByRadius } from './pins.js'

// Ferry Building ~ Coit Tower is ~0.8 mi; Ferry Building ~ Golden Gate Park is ~4.5 mi.
const FERRY = { latitude: 37.7955, longitude: -122.3937 }
const rows = [
  { id: 1, name: 'Coit Tower', latitude: 37.8024, longitude: -122.4058 },
  { id: 2, name: 'GG Park', latitude: 37.7694, longitude: -122.4862 },
  { id: 3, name: 'No Coords', latitude: null, longitude: null },
]

test('filterByRadius keeps in-radius rows and annotates distanceMi', () => {
  const out = filterByRadius(rows, { lat: FERRY.latitude, lng: FERRY.longitude, radius: 2 })
  assert.equal(out.length, 1)
  assert.equal(out[0].id, 1)
  assert.equal(typeof out[0].distanceMi, 'number')
  assert.ok(out[0].distanceMi > 0 && out[0].distanceMi < 2)
  // rounded to 1 decimal place
  assert.equal(out[0].distanceMi, Math.round(out[0].distanceMi * 10) / 10)
})

test('filterByRadius includes rows within a larger radius', () => {
  const out = filterByRadius(rows, { lat: FERRY.latitude, lng: FERRY.longitude, radius: 6 })
  assert.deepEqual(out.map((r) => r.id), [1, 2])
})

test('filterByRadius drops rows with missing coordinates', () => {
  const out = filterByRadius(rows, { lat: FERRY.latitude, lng: FERRY.longitude, radius: 100 })
  assert.equal(out.find((r) => r.id === 3), undefined)
})

test('filterByRadius does not mutate the input rows', () => {
  filterByRadius(rows, { lat: FERRY.latitude, lng: FERRY.longitude, radius: 2 })
  assert.equal('distanceMi' in rows[0], false)
})
