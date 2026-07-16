import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

import { geocodeAddress, geocodeMembers } from './geocode.js'

// geocode.js reads process.env.GEOAPIFY_API_KEY lazily; set a dummy for most tests.
const ORIGINAL_KEY = process.env.GEOAPIFY_API_KEY
before(() => {
  process.env.GEOAPIFY_API_KEY = 'test-key'
})
after(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.GEOAPIFY_API_KEY
  else process.env.GEOAPIFY_API_KEY = ORIGINAL_KEY
})

// A Geoapify forward-geocode hit: GeoJSON features with [lon, lat] coordinates.
const HIT = {
  features: [{ geometry: { type: 'Point', coordinates: [-122.3937, 37.7955] } }],
}

function stubFetch(payload, { ok = true, status = 200 } = {}) {
  return async () => ({ ok, status, json: async () => payload })
}

function recordingFetch(payload) {
  const calls = []
  const impl = async (url) => {
    calls.push(url)
    return { ok: true, status: 200, json: async () => payload }
  }
  return { impl, calls }
}

test('geocodeAddress: maps a Geoapify hit ([lon, lat]) to { latitude, longitude }', async () => {
  const coords = await geocodeAddress('Ferry Building', stubFetch(HIT))
  assert.deepEqual(coords, { latitude: 37.7955, longitude: -122.3937 })
})

test('geocodeAddress: returns null when there are no features', async () => {
  const coords = await geocodeAddress('nowhere at all', stubFetch({ features: [] }))
  assert.equal(coords, null)
})

test('geocodeAddress: throws on a non-ok HTTP response', async () => {
  await assert.rejects(
    () => geocodeAddress('anywhere', stubFetch({}, { ok: false, status: 401 })),
    /Geocoding request failed \(401\)/
  )
})

test('geocodeAddress: throws a clear error when GEOAPIFY_API_KEY is unset', async () => {
  const saved = process.env.GEOAPIFY_API_KEY
  delete process.env.GEOAPIFY_API_KEY
  try {
    await assert.rejects(() => geocodeAddress('anywhere', stubFetch(HIT)), /GEOAPIFY_API_KEY is not set/)
  } finally {
    process.env.GEOAPIFY_API_KEY = saved
  }
})

test('geocodeAddress: sends the api key and an SF proximity bias', async () => {
  const { impl, calls } = recordingFetch(HIT)
  await geocodeAddress('Ferry Building', impl)
  assert.match(calls[0], /apiKey=test-key/)
  assert.match(calls[0], /bias=proximity%3A-122\.4194%2C37\.7749/) // proximity:lon,lat url-encoded
})

test('geocodeMembers: replaces text startLocation with coordinates', async () => {
  const members = [
    { name: 'A', startLocation: 'Ferry Building', interestTags: ['art'] },
    { name: 'B', startLocation: 'Union Square', interestTags: ['coffee'] },
  ]
  const resolved = await geocodeMembers(members, stubFetch(HIT))
  assert.deepEqual(resolved[0].startLocation, { latitude: 37.7955, longitude: -122.3937 })
  assert.equal(resolved[0].name, 'A')
  assert.equal(resolved[0].interestTags[0], 'art')
})

test('geocodeMembers: throws a tagged error naming the member + address on failure', async () => {
  const members = [{ name: 'Cara', startLocation: 'asdfghjkl', interestTags: [] }]
  await assert.rejects(
    () => geocodeMembers(members, stubFetch({ features: [] })),
    (err) => {
      assert.equal(err.code, 'GEOCODE_FAILED')
      assert.match(err.message, /Cara/)
      assert.match(err.message, /asdfghjkl/)
      return true
    }
  )
})

test('geocodeMembers: passes through a member already carrying coordinates (idempotent)', async () => {
  const preCoded = { name: 'A', startLocation: { latitude: 37.78, longitude: -122.41 } }
  const resolved = await geocodeMembers([preCoded], stubFetch(HIT))
  assert.deepEqual(resolved[0].startLocation, { latitude: 37.78, longitude: -122.41 })
})

test('geocodeMembers: preserves member order', async () => {
  const members = [
    { name: 'First', startLocation: 'A' },
    { name: 'Second', startLocation: 'B' },
    { name: 'Third', startLocation: 'C' },
  ]
  const resolved = await geocodeMembers(members, stubFetch(HIT))
  assert.deepEqual(resolved.map((m) => m.name), ['First', 'Second', 'Third'])
})
