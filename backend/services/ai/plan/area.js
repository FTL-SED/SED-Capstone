// Derives a short neighborhood label for a pin, used only to help the LLM group
// nearby places when ordering (it never sees raw coordinates — the backend owns
// all routing). Cheap and deterministic: no external geocoding, no seed
// migration. Prefers the pin's own address (already "…, Neighborhood/City, …"),
// then falls back to a coarse lat/long bucket of SF's main districts, then a
// neutral label. Approximate by design — it's a grouping hint, not a fact.

// Very coarse SF district centroids. Nearest centroid (straight-line in degrees,
// which is fine at city scale) names the area. Kept short — the goal is "cluster
// the Mission stops together", not precise boundaries.
const SF_DISTRICTS = [
  { name: 'Mission', lat: 37.7599, lng: -122.4148 },
  { name: 'SoMa', lat: 37.7785, lng: -122.4056 },
  { name: 'Downtown', lat: 37.7879, lng: -122.4074 },
  { name: 'North Beach', lat: 37.8003, lng: -122.4104 },
  { name: 'Fisherman’s Wharf', lat: 37.808, lng: -122.4177 },
  { name: 'Marina', lat: 37.8037, lng: -122.4368 },
  { name: 'Presidio', lat: 37.7989, lng: -122.4662 },
  { name: 'Richmond', lat: 37.7801, lng: -122.4644 },
  { name: 'Sunset', lat: 37.7523, lng: -122.4936 },
  { name: 'Golden Gate Park', lat: 37.7694, lng: -122.4862 },
  { name: 'Haight', lat: 37.7692, lng: -122.4481 },
  { name: 'Castro', lat: 37.7609, lng: -122.435 },
  { name: 'Nob Hill', lat: 37.7929, lng: -122.4159 },
  { name: 'Hayes Valley', lat: 37.7765, lng: -122.4244 },
  { name: 'Bernal Heights', lat: 37.7395, lng: -122.4156 },
]

// The address's neighborhood-ish segment: "123 Main St, Mission, San Francisco"
// -> "Mission". Addresses vary, so this is best-effort — return null when the
// shape doesn't yield a useful label so the caller falls back to the grid.
const areaFromAddress = (address) => {
  if (typeof address !== 'string' || !address.trim()) return null
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
  // Need at least "street, area, city"; the 2nd segment is the neighborhood.
  if (parts.length < 3) return null
  const area = parts[1]
  // Skip a segment that's just a city/state/zip rather than a neighborhood.
  if (/^\d/.test(area) || /^[A-Z]{2}$/.test(area) || /san francisco/i.test(area)) return null
  return area
}

// Nearest coarse district by squared-degree distance (city scale, so no
// haversine needed for a grouping hint).
const areaFromCoords = (lat, lng) => {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  let best = null
  let bestD = Infinity
  for (const d of SF_DISTRICTS) {
    const dd = (lat - d.lat) ** 2 + (lng - d.lng) ** 2
    if (dd < bestD) {
      bestD = dd
      best = d.name
    }
  }
  return best
}

const neighborhoodOf = (pin) =>
  areaFromAddress(pin?.address) ?? areaFromCoords(pin?.latitude, pin?.longitude) ?? 'San Francisco'

export { neighborhoodOf, areaFromAddress, areaFromCoords }
