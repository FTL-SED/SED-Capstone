import { test } from 'node:test'
import assert from 'node:assert/strict'
import { neighborhoodOf, areaFromAddress, areaFromCoords } from './area.js'

test('areaFromAddress pulls the neighborhood segment', () => {
  assert.equal(areaFromAddress('2889 Mission St, Mission, San Francisco, CA'), 'Mission')
  assert.equal(areaFromAddress('1 Ferry Building, Embarcadero, San Francisco, CA'), 'Embarcadero')
})

test('areaFromAddress returns null when there is no usable neighborhood segment', () => {
  assert.equal(areaFromAddress('San Francisco'), null) // too few parts
  assert.equal(areaFromAddress('123 Main St, San Francisco, CA'), null) // 2nd seg is the city
  assert.equal(areaFromAddress(''), null)
  assert.equal(areaFromAddress(undefined), null)
})

test('areaFromCoords names the nearest coarse SF district', () => {
  assert.equal(areaFromCoords(37.7599, -122.4148), 'Mission')
  assert.equal(areaFromCoords(37.8024, -122.4058), 'North Beach')
  assert.equal(areaFromCoords(undefined, undefined), null)
})

test('neighborhoodOf prefers the address, then coords, then a neutral label', () => {
  assert.equal(
    neighborhoodOf({ address: '2889 Mission St, Mission, San Francisco, CA', latitude: 37.8, longitude: -122.4 }),
    'Mission',
  )
  // No usable address → nearest district by coords.
  assert.equal(neighborhoodOf({ address: '123 Main St, San Francisco, CA', latitude: 37.8024, longitude: -122.4058 }), 'North Beach')
  // Nothing usable → neutral label.
  assert.equal(neighborhoodOf({}), 'San Francisco')
})
