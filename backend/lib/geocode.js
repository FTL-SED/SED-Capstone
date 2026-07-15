// Geocodes free-text member start addresses into { latitude, longitude } via
// Mapbox, so the recommendation engine's Stage 0 (meeting point + travel radius)
// can run on real form input. Members are typed in by the organizer (US #3) and
// are NOT app users, so coordinates can't come from a User row — they're resolved
// here at request time.
//
// Secret + network access are confined to lib/ per .claude/rules/backend.md.
// Uses Node's built-in fetch (no dependency); `fetchImpl` is injectable so tests
// never hit the network.
import { MAPBOX_GEOCODE_URL, MAPBOX_PROXIMITY } from '../config/recommendation.js'

// Already-numeric coordinates (e.g. a pre-geocoded caller or the engine's own
// tests) — nothing to look up.
function hasCoords(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.latitude === 'number' &&
    typeof value.longitude === 'number'
  )
}

// Resolve one address string to { latitude, longitude }, or null when Mapbox
// returns no match. Throws on missing token or network/HTTP failure so the
// caller can distinguish "misconfigured / couldn't reach the service" from
// "no such place".
async function geocodeAddress(address, fetchImpl = fetch) {
  const token = process.env.MAPBOX_TOKEN
  if (!token) {
    throw new Error('MAPBOX_TOKEN is not set')
  }

  const params = new URLSearchParams({
    q: address,
    access_token: token,
    limit: '1',
    // Bias toward SF so bare place names resolve locally.
    proximity: `${MAPBOX_PROXIMITY.longitude},${MAPBOX_PROXIMITY.latitude}`,
  })
  const res = await fetchImpl(`${MAPBOX_GEOCODE_URL}?${params}`)

  if (!res.ok) {
    throw new Error(`Geocoding request failed (${res.status})`)
  }

  const body = await res.json()
  const feature = body?.features?.[0]
  if (!feature) return null

  // Mapbox GeoJSON returns coordinates as [longitude, latitude].
  const [longitude, latitude] = feature.geometry.coordinates
  return { latitude, longitude }
}

// Return a copy of `members` with each string `startLocation` replaced by
// coordinates. Members already carrying coords pass through untouched
// (idempotent). An un-geocodable address throws a tagged error naming the member
// + address so the controller can surface a clear 4xx rather than silently
// dropping them.
async function geocodeMembers(members, fetchImpl = fetch) {
  const resolved = []

  for (const member of members) {
    if (hasCoords(member.startLocation)) {
      resolved.push(member)
      continue
    }

    const coords = await geocodeAddress(member.startLocation, fetchImpl)
    if (!coords) {
      const err = new Error(
        `Couldn't locate "${member.startLocation}" for ${member.name}`
      )
      err.code = 'GEOCODE_FAILED'
      throw err
    }

    resolved.push({ ...member, startLocation: coords })
  }

  return resolved
}

export { geocodeAddress, geocodeMembers }
