// backend/scripts/enrich/dedupHelpers.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clusterByProximity, pickSurvivor } from './dedupHelpers.js'

const P = (id, name, lat, lon, extra = {}) => ({ id, name, latitude: lat, longitude: lon, ...extra })

test('clusterByProximity groups same-name pins within the threshold', () => {
  const pins = [
    P(1, 'Blue Bottle', 37.7770, -122.4230),
    P(2, 'Blue Bottle', 37.7771, -122.4231), // ~14m from #1 → same cluster
    P(3, 'Blue Bottle', 37.8000, -122.4500), // ~3km away → different place
    P(4, 'Ritual', 37.7560, -122.4210),      // singleton name
  ]
  const clusters = clusterByProximity(pins, 100)
  assert.equal(clusters.length, 1)
  assert.deepEqual(clusters[0].map((p) => p.id).sort(), [1, 2])
})

test('clusterByProximity single-linkage: a chain A~B~C stays one cluster even if A–C exceeds the threshold', () => {
  // At SF latitude ~0.001° lon ≈ 88m. A→B ≈ 88m (ok), B→C ≈ 88m (ok),
  // but A→C ≈ 176m (> 100m). Single-linkage must still merge all three.
  const pins = [
    P(1, 'Chain', 37.7700, -122.4200),
    P(2, 'Chain', 37.7700, -122.4190), // ~88m from #1
    P(3, 'Chain', 37.7700, -122.4180), // ~88m from #2, ~176m from #1
  ]
  const clusters = clusterByProximity(pins, 100)
  assert.equal(clusters.length, 1)
  assert.deepEqual(clusters[0].map((p) => p.id).sort(), [1, 2, 3])
})

test('clusterByProximity is case-insensitive on name and ignores singletons', () => {
  const pins = [P(1, 'Cafe X', 37.77, -122.42), P(2, 'cafe x', 37.7701, -122.42)]
  const clusters = clusterByProximity(pins, 100)
  assert.equal(clusters.length, 1)
  assert.equal(clusters[0].length, 2)
})

test('clusterByProximity keeps far same-name pins in separate (non-)clusters', () => {
  const pins = [P(1, 'KFC', 37.70, -122.40), P(2, 'KFC', 37.79, -122.41)] // ~10km
  assert.equal(clusterByProximity(pins, 100).length, 0)
})

test('pickSurvivor prefers a referenced pin above all else', () => {
  const cluster = [
    P(1, 'X', 0, 0, { source: 'curated', description: 'nice', rating: 4.5 }),
    P(2, 'X', 0, 0, { source: 'osm', description: null, rating: null }),
  ]
  const { survivor, losers } = pickSurvivor(cluster, new Set([2]))
  assert.equal(survivor.id, 2)
  assert.deepEqual(losers.map((l) => l.id), [1])
})

test('pickSurvivor falls through curated > has-description > has-rating > lowest id', () => {
  const cluster = [
    P(3, 'X', 0, 0, { source: 'osm', description: null, rating: 4.1 }),
    P(1, 'X', 0, 0, { source: 'curated', description: null, rating: null }),
    P(2, 'X', 0, 0, { source: 'osm', description: 'has one', rating: null }),
  ]
  const { survivor } = pickSurvivor(cluster, new Set())
  assert.equal(survivor.id, 1) // curated wins
})

test('pickSurvivor tiebreaks on lowest id when all else equal', () => {
  const cluster = [
    P(9, 'X', 0, 0, { source: 'osm', description: null, rating: null }),
    P(4, 'X', 0, 0, { source: 'osm', description: null, rating: null }),
  ]
  assert.equal(pickSurvivor(cluster, new Set()).survivor.id, 4)
})
