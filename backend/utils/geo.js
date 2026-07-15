// Great-circle distance helpers. Shared by the AI fallback sequencer (for
// nearest-neighbor ordering) and available to the recommendation engine.
// Pure: plain {latitude, longitude} points in, numbers out.

const EARTH_RADIUS_MILES = 3958.8
const toRad = (deg) => (deg * Math.PI) / 180

// Straight-line ("as the crow flies") distance in miles between two points.
// Good enough for ordering stops; not a substitute for real routing distance.
function haversineMiles(a, b) {
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)))
}

const MILES_TO_METERS = 1609.344

function milesToMeters(miles) {
  return miles * MILES_TO_METERS
}

export { haversineMiles, milesToMeters }
