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

// PUT /itineraries/:id — update an itinerary the caller owns. Body carries only
// the fields being changed (e.g. { title, description, isPublic }).
export async function updateItinerary(id, changes) {
  const { data } = await api.put(`/itineraries/${id}`, changes)
  return data
}

// DELETE /itineraries/:id — delete an itinerary the caller owns (204 No Content).
export async function deleteItinerary(id) {
  await api.delete(`/itineraries/${id}`)
}

// POST /itineraries/:id/copy — deep-copy a public (or owned) itinerary into a
// new editable one owned by the caller. Returns the new itinerary.
export async function copyItinerary(id) {
  const { data } = await api.post(`/itineraries/${id}/copy`)
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

// GET /pins — browse/search the venue catalog to pick a place to add to an
// itinerary. params: { q, category, limit, offset }. Returns catalog venues.
export async function searchCatalog(params = {}) {
  const { data } = await api.get('/pins', { params })
  return data
}

// POST /pins — add a stop to an itinerary that references an existing catalog
// venue. body: { itineraryId, pinId, orderInItinerary, startTime, endTime, ... }.
// (The endpoint operates on ItineraryStop; "pin" in the path is legacy naming.)
// Returns the created stop (with its venue included).
export async function addStop(body) {
  const { data } = await api.post('/pins', body)
  return data
}

// DELETE /pins/:stopId — remove a stop from an itinerary (204 No Content). Takes
// the ItineraryStop id (the `stopId` field on each pin in the detail response),
// NOT the venue pin id. The catalog venue itself is untouched.
export async function deleteStop(stopId) {
  await api.delete(`/pins/${stopId}`)
}
