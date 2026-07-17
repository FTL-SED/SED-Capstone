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
// body: { shortlist, constraints, tripDate?, isPublic?, title?, description? }
// A user-supplied title/description override the AI-generated ones (blank ⇒
// keep the AI's). returns: { itinerary, source } on success (201), or
// { feasible: false, reason } (200) when constraints are too tight.
// Hits a live model with the backend's own retry budget (~up to 40s worst
// case), so use a generous client timeout so we don't abort before it responds.
const AI_TIMEOUT_MS = 60_000
export async function generateItinerary(body) {
  const { data } = await api.post('/ai-agent', body, { timeout: AI_TIMEOUT_MS })
  return data
}

// GET /itineraries/:id — the persisted itinerary with its ordered pins.
export async function getItinerary(id) {
  const { data } = await api.get(`/itineraries/${id}`)
  return data
}

// GET /itineraries — list itineraries. params: { scope, limit, offset, sort, q,
// location, interests }. Defaults to the public Explore feed.
export async function listItineraries(params = {}) {
  const { data } = await api.get('/itineraries', { params })
  return data
}

// GET /users/:id — the owner's dashboard, including createdItineraries plus
// likedItineraries / bookmarkedItineraries (owner-only; the backend 403s for
// another user's id). Used to hydrate the home page's liked/bookmarked state.
export async function getUserDashboard(id) {
  const { data } = await api.get(`/users/${id}`)
  return data
}

// Like / unlike an itinerary. POST adds, DELETE removes; both are idempotent on
// the backend and return the refreshed { likeCount }.
export async function likeItinerary(id) {
  const { data } = await api.post(`/itineraries/${id}/like`)
  return data
}
export async function unlikeItinerary(id) {
  const { data } = await api.delete(`/itineraries/${id}/like`)
  return data
}

// Bookmark / un-bookmark an itinerary (idempotent; 204 No Content).
export async function bookmarkItinerary(id) {
  await api.post(`/itineraries/${id}/bookmark`)
}
export async function removeBookmark(id) {
  await api.delete(`/itineraries/${id}/bookmark`)
}
