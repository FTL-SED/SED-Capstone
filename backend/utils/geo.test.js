import { test } from 'node:test'
import assert from 'node:assert/strict'

import { haversineMiles, milesToMeters } from './geo.js'

test('distance from a point to itself is zero', () => {
  const p = { latitude: 37.77, longitude: -122.42 }
  assert.equal(haversineMiles(p, p), 0)
})

test('haversine matches a known SF distance within tolerance', () => {
  // Ferry Building → Golden Gate Park, ~5 miles apart.
  const ferry = { latitude: 37.7955, longitude: -122.3937 }
  const park = { latitude: 37.7694, longitude: -122.4862 }
  const miles = haversineMiles(ferry, park)
  assert.ok(miles > 4.5 && miles < 6, `expected ~5 miles, got ${miles}`)
})

test('distance is symmetric', () => {
  const a = { latitude: 37.79, longitude: -122.39 }
  const b = { latitude: 37.77, longitude: -122.48 }
  assert.ok(Math.abs(haversineMiles(a, b) - haversineMiles(b, a)) < 1e-9)
})

test('milesToMeters converts using 1609.344', () => {
  assert.ok(Math.abs(milesToMeters(1) - 1609.344) < 1e-6)
})
