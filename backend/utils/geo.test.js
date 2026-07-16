import { test } from 'node:test'
import assert from 'node:assert/strict'

import { haversineMiles, centroid, geometricMedian, maxDistanceFrom, milesToMeters } from './geo.js'

// Real SF landmarks, for distances with a known ballpark.
const FERRY_BUILDING = { latitude: 37.7955, longitude: -122.3937 }
const GOLDEN_GATE_PARK = { latitude: 37.7694, longitude: -122.4862 }

test('haversineMiles: zero distance between identical points', () => {
  assert.equal(haversineMiles(FERRY_BUILDING, FERRY_BUILDING), 0)
})

test('haversineMiles: Ferry Building to Golden Gate Park is ~5 miles', () => {
  const d = haversineMiles(FERRY_BUILDING, GOLDEN_GATE_PARK)
  assert.ok(d > 4.5 && d < 5.5, `expected ~5 miles, got ${d}`)
})

test('haversineMiles: symmetric', () => {
  assert.equal(
    haversineMiles(FERRY_BUILDING, GOLDEN_GATE_PARK),
    haversineMiles(GOLDEN_GATE_PARK, FERRY_BUILDING)
  )
})

test('centroid: plain average of coordinates', () => {
  const c = centroid([
    { latitude: 0, longitude: 0 },
    { latitude: 10, longitude: 20 },
  ])
  assert.deepEqual(c, { latitude: 5, longitude: 10 })
})

test('geometricMedian: falls back to centroid for a single point', () => {
  const only = { latitude: 37.78, longitude: -122.41 }
  assert.deepEqual(geometricMedian([only]), only)
})

test('geometricMedian: falls back to centroid for two points', () => {
  const pts = [
    { latitude: 37.78, longitude: -122.41 },
    { latitude: 37.76, longitude: -122.45 },
  ]
  assert.deepEqual(geometricMedian(pts), centroid(pts))
})

test('geometricMedian: a lone outlier does not drag the point (unlike the centroid)', () => {
  // Three members clustered downtown, one far out in the Richmond.
  const clustered = [
    { latitude: 37.7955, longitude: -122.3937 }, // Ferry Building
    { latitude: 37.7749, longitude: -122.4194 }, // Civic Center-ish
    { latitude: 37.7845, longitude: -122.4079 }, // Union Square-ish
  ]
  const outlier = { latitude: 37.78, longitude: -122.51 } // Ocean Beach edge
  const pts = [...clustered, outlier]

  const median = geometricMedian(pts)
  const mean = centroid(pts)

  // The median should sit closer to the downtown cluster than the plain mean does.
  const clusterCenter = centroid(clustered)
  const medianToCluster = haversineMiles(median, clusterCenter)
  const meanToCluster = haversineMiles(mean, clusterCenter)
  assert.ok(
    medianToCluster < meanToCluster,
    `median (${medianToCluster}mi) should hug the cluster more than the mean (${meanToCluster}mi)`
  )
})

test('geometricMedian: does not crash when a point sits on the estimate', () => {
  // Two points identical to a likely estimate + others — exercises the
  // zero-distance skip without throwing.
  const pts = [
    { latitude: 37.78, longitude: -122.41 },
    { latitude: 37.78, longitude: -122.41 },
    { latitude: 37.80, longitude: -122.40 },
    { latitude: 37.76, longitude: -122.42 },
  ]
  const median = geometricMedian(pts)
  assert.equal(typeof median.latitude, 'number')
  assert.equal(typeof median.longitude, 'number')
  assert.ok(Number.isFinite(median.latitude) && Number.isFinite(median.longitude))
})

test('maxDistanceFrom: returns the farthest point distance', () => {
  const center = FERRY_BUILDING
  const pts = [FERRY_BUILDING, GOLDEN_GATE_PARK]
  const max = maxDistanceFrom(center, pts)
  assert.equal(max, haversineMiles(center, GOLDEN_GATE_PARK))
})

test('maxDistanceFrom: zero when every point is the center', () => {
  assert.equal(maxDistanceFrom(FERRY_BUILDING, [FERRY_BUILDING, FERRY_BUILDING]), 0)
})

test('milesToMeters: converts miles to meters', () => {
  assert.equal(milesToMeters(1), 1609.344)
  assert.equal(milesToMeters(0), 0)
})
