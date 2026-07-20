// Builds the query params for listItineraries() from the Discover page's
// search/filter/sort/pagination state. Pure so it can be unit-tested apart
// from the component (same pattern as CreateItineraryPage/buildRequest.js).
// Omits q/interests when empty so the default feed is a clean
// scope=public&sort=recent request.
export function buildDiscoverParams(query, interests, sort, offset, limit) {
  const params = { scope: 'public', sort, limit, offset }

  const trimmed = query.trim()
  if (trimmed !== '') {
    params.q = trimmed
  }

  if (interests.length > 0) {
    params.interests = interests.join(',')
  }

  return params
}
