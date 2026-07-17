import axios from 'axios'

// Geoapify address autocomplete → coordinates. The backend requires each
// starting location as { latitude, longitude } (it never geocodes), so the
// wizard resolves typed addresses here before submitting.
// See .claude/roadmap/frontend-backend-integration.md (Step 4).
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY
const AUTOCOMPLETE_URL = 'https://api.geoapify.com/v1/geocode/autocomplete'

// Rough San Francisco bias box (lon1,lat1,lon2,lat2) so suggestions favor the
// city the catalog covers, without hard-filtering out nearby valid results.
const SF_BIAS = 'rect:-122.5247,37.7045,-122.3549,37.8324'

// Returns up to `limit` suggestions for the typed text, each:
//   { label: string, latitude: number, longitude: number }
// Empty text (or a missing key) yields []. Callers should debounce.
export async function suggestAddresses(text, { limit = 5 } = {}) {
  const query = text?.trim()
  if (!query || !GEOAPIFY_KEY) return []

  const { data } = await axios.get(AUTOCOMPLETE_URL, {
    params: {
      text: query,
      apiKey: GEOAPIFY_KEY,
      limit,
      bias: SF_BIAS,
      format: 'json',
    },
  })

  return (data?.results ?? [])
    .filter((r) => typeof r.lat === 'number' && typeof r.lon === 'number')
    .map((r) => ({
      label: r.formatted ?? r.address_line1 ?? query,
      latitude: r.lat,
      longitude: r.lon,
    }))
}
