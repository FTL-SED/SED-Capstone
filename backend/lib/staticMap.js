// Geoapify Static Maps client. lib/ is the only layer that reads process.env
// (backend rules). Given a list of located stops, requests a PNG of the map with
// a numbered marker per stop and returns it as a Buffer for the PDF to embed.
//
// Fail-soft by design: any missing key, bad input, network error, timeout, or
// non-image response resolves to `null` so the PDF still builds (just without the
// map) — an export must never fail because the map service is down.
const STATIC_MAP_URL = 'https://maps.geoapify.com/v1/staticmap'

// Geoapify's free static-map cap; requesting a larger canvas 400s. A taller 3:2
// canvas gives the PDF a larger, more prominent map.
const MAX_SIZE = { width: 1200, height: 800 }
const REQUEST_TIMEOUT_MS = 8000

// Sunset marker (#e1783c) to match the brand palette; '#' must be URL-encoded.
const MARKER_COLOR = '%23e1783c'

// Builds the `marker=` query value: one pin per located stop, numbered 1..n.
// Format: lonlat:LON,LAT;type:material;color:#..;size:..;text:N joined by '|'.
// (Geoapify rejects unknown params like `whitecolor`, so only documented ones.)
function buildMarkers(points) {
  return points
    .map(
      ({ latitude, longitude }, i) =>
        `lonlat:${longitude},${latitude};type:material;color:${MARKER_COLOR};size:large;text:${i + 1}`,
    )
    .join('|')
}

// Fetches a static map PNG for the given located stops.
//   points: [{ latitude:Number, longitude:Number }, ...]
// Returns a Buffer on success, or null if a map can't be produced.
export async function fetchStaticMap(points, { width = MAX_SIZE.width, height = MAX_SIZE.height } = {}) {
  const apiKey = process.env.GEOAPIFY_API_KEY
  if (!apiKey) return null

  const located = (points ?? []).filter(
    (p) => typeof p?.latitude === 'number' && typeof p?.longitude === 'number',
  )
  if (located.length === 0) return null

  const params = new URLSearchParams({
    style: 'osm-bright',
    width: String(Math.min(width, MAX_SIZE.width)),
    height: String(Math.min(height, MAX_SIZE.height)),
    format: 'png',
    apiKey,
  })
  // Let Geoapify auto-fit the viewport to the markers' bounding box, so every pin
  // is in frame regardless of how spread out the stops are.
  if (located.length === 1) {
    params.set('center', `lonlat:${located[0].longitude},${located[0].latitude}`)
    params.set('zoom', '14')
  }

  // URLSearchParams would percent-encode the ':' ';' '|' that Geoapify's marker
  // grammar needs literal, so append the already-encoded marker string by hand.
  const url = `${STATIC_MAP_URL}?${params.toString()}&marker=${buildMarkers(located)}`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    let res
    try {
      res = await fetch(url, { signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) {
      console.error(`fetchStaticMap: Geoapify responded ${res.status}`)
      return null
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) {
      console.error(`fetchStaticMap: unexpected content-type "${contentType}"`)
      return null
    }
    return Buffer.from(await res.arrayBuffer())
  } catch (err) {
    console.error('fetchStaticMap: request failed:', err)
    return null
  }
}
