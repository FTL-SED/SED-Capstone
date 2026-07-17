import api from './client.js'

// Backend calls for the itinerary-generation flow. Components import these
// instead of knowing endpoint paths or shapes. All requests carry the auth
// token via the shared client's interceptor.
// See .claude/roadmap/frontend-backend-integration.md (Step 2).

// POST /recommendations
// body: { trip, members } (see buildRequest.js).
// returns: { shortlist, constraints, reason? } — `reason` is present only when
// the shortlist is empty (no places matched); callers should check for it.
export async function getRecommendations(body) {
  const { data } = await api.post('/recommendations', body)
  return data
}

// POST /ai-agent
// body: { shortlist, constraints, tripDate?, isPublic? }
// returns: { itinerary, source } on success (201), or { feasible: false, reason }
// (200) when the constraints are too tight for any itinerary.
export async function generateItinerary(body) {
  const { data } = await api.post('/ai-agent', body)
  return data
}

// GET /itineraries/:id — the persisted itinerary with its ordered pins.
export async function getItinerary(id) {
  const { data } = await api.get(`/itineraries/${id}`)
  return data
}
