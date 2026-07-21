// Generic geographic math — pure, no DB/Express, reusable across features
// (the recommendation engine's Stage 0 meeting point + radius filter today; the
// AI sequencing step's travel distances later). Coordinates are always plain
// { latitude, longitude } objects in decimal degrees.
import {
  MEETING_POINT_MAX_ITERATIONS,
  MEETING_POINT_EPSILON,
} from '../config/recommendation.js'

const EARTH_RADIUS_MILES = 3958.8
const toRadians = (deg) => (deg * Math.PI) / 180

// Great-circle distance in miles between two { latitude, longitude } points.
function haversineMiles(a, b) {
  const dLat = toRadians(b.latitude - a.latitude)
  const dLon = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Plain average of the points' coordinates. Minimizes squared distance, so a
// single far-away point pulls it toward itself — used only as the Weiszfeld seed.
function centroid(points) {
  const sum = points.reduce(
    (acc, p) => ({ latitude: acc.latitude + p.latitude, longitude: acc.longitude + p.longitude }),
    { latitude: 0, longitude: 0 }
  )
  return { latitude: sum.latitude / points.length, longitude: sum.longitude / points.length }
}

// The point minimizing the SUM of distances to every input point (the geometric
// median), via Weiszfeld's algorithm. Unlike the centroid it resists a lone
// outlier, so it's a fair group meeting spot. Seeded from the centroid; ≤2 points
// (or a degenerate set) just returns the centroid.
function geometricMedian(points) {
  if (points.length <= 2) return centroid(points)

  let current = centroid(points)

  for (let i = 0; i < MEETING_POINT_MAX_ITERATIONS; i++) {
    let numLat = 0
    let numLon = 0
    let denom = 0

    for (const p of points) {
      const d = haversineMiles(current, p)
      if (d === 0) continue // point sits on the estimate: skip its term (no divide-by-zero)
      numLat += p.latitude / d
      numLon += p.longitude / d
      denom += 1 / d
    }

    if (denom === 0) break // every point coincides with the estimate; done
    const next = { latitude: numLat / denom, longitude: numLon / denom }

    if (haversineMiles(current, next) < MEETING_POINT_EPSILON) {
      current = next
      break
    }
    current = next
  }

  return current
}

// The largest distance from `center` to any of `points` — the fairness metric
// (how far the worst-off member has to travel to the meeting spot).
function maxDistanceFrom(center, points) {
  return points.reduce((max, p) => Math.max(max, haversineMiles(center, p)), 0)
}

// The point in `candidates` closest to `target`, or null when candidates is
// empty. Used to snap a computed meeting point (which can land in water — the
// geometric median of members on opposite shores of a bay) onto a real venue,
// which is always on land. Candidates must carry { latitude, longitude }.
function nearestPoint(target, candidates) {
  let best = null
  let bestDist = Infinity
  for (const c of candidates) {
    const d = haversineMiles(target, c)
    if (d < bestDist) {
      bestDist = d
      best = c
    }
  }
  return best
}

// Convert miles to meters — used by the AI sequencing step to report per-stop
// travel distances in metric units.
const MILES_TO_METERS = 1609.344
function milesToMeters(miles) {
  return miles * MILES_TO_METERS
}

export { haversineMiles, centroid, geometricMedian, maxDistanceFrom, nearestPoint, milesToMeters }
