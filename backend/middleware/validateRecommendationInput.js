// Validates the constraints payload for POST /recommendations before it
// reaches the controller, per .claude/rules/backend.md → Middleware.
// Shape expected by recommend(trip, members, places):
//   trip:    { startTime: 'HH:MM', endTime: 'HH:MM', maxBudgetPerPerson: number,
//              travelRadius?: number }
//   members: [{ name, startLocation: { latitude, longitude }, interestTags?[],
//               foodPrefs?[], diet?[] }]
// startLocation arrives as coordinates: the frontend resolves the address via
// Geoapify autocomplete and sends the lat/long of the picked suggestion, so the
// backend never geocodes.
//
// The Create-Itinerary wizard collects GROUP-level data (shared interests/food/
// diet + one or more starting coordinates), not per-member. So this middleware
// also accepts a `group` shape and expands it into `members` (one synthesized
// member per coordinate, each carrying the shared prefs) before the controller
// runs — the engine still only ever sees a `members` array.
//   group: { startingCoordinates: [{ latitude, longitude }, ...],
//            interestTags?[], foodPrefs?[], diet?[] }
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function isStringArray(value) {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

// A { latitude, longitude } pair with real, in-range coordinates.
function isCoordinate(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.latitude === 'number' &&
    typeof value.longitude === 'number' &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180
  )
}

function validateTrip(trip) {
  if (!trip || typeof trip !== 'object') return 'trip is required'
  if (typeof trip.startTime !== 'string' || !TIME_RE.test(trip.startTime)) {
    return 'trip.startTime is required and must be an "HH:MM" string'
  }
  if (typeof trip.endTime !== 'string' || !TIME_RE.test(trip.endTime)) {
    return 'trip.endTime is required and must be an "HH:MM" string'
  }
  // Same-day trips only: endTime must be after startTime. The engine doesn't
  // model windows that cross midnight, so reject them here rather than let the
  // day silently collapse to an empty window.
  const [sh, sm] = trip.startTime.split(':').map(Number)
  const [eh, em] = trip.endTime.split(':').map(Number)
  if (eh * 60 + em <= sh * 60 + sm) {
    return 'trip.endTime must be later than trip.startTime (same-day trips only)'
  }
  if (typeof trip.maxBudgetPerPerson !== 'number' || trip.maxBudgetPerPerson < 0) {
    return 'trip.maxBudgetPerPerson is required and must be a non-negative number'
  }
  // travelRadius is optional (the engine no-ops without it), but reject an invalid one.
  if (
    trip.travelRadius !== undefined &&
    (typeof trip.travelRadius !== 'number' || trip.travelRadius <= 0)
  ) {
    return 'trip.travelRadius must be a positive number when provided'
  }
  return null
}

function validateMembers(members) {
  if (!Array.isArray(members) || members.length === 0) {
    return 'members is required and must be a non-empty array'
  }
  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    if (!member || typeof member !== 'object' || typeof member.name !== 'string' || member.name.trim() === '') {
      return `members[${i}].name is required`
    }
    // startLocation must be coordinates (from the frontend's address picker) —
    // the meeting point + radius filter need real lat/long to work.
    if (!isCoordinate(member.startLocation)) {
      return `members[${i}].startLocation is required and must be { latitude, longitude } coordinates`
    }
    if (member.interestTags !== undefined && !isStringArray(member.interestTags)) {
      return `members[${i}].interestTags must be an array of strings`
    }
    if (member.foodPrefs !== undefined && !isStringArray(member.foodPrefs)) {
      return `members[${i}].foodPrefs must be an array of strings`
    }
    if (member.diet !== undefined && !isStringArray(member.diet)) {
      return `members[${i}].diet must be an array of strings`
    }
  }
  return null
}

// Validate the wizard's group-level shape and expand it into a members array
// (one member per starting coordinate, all sharing the group's prefs). Returns
// an error string, or null and mutates req.body.members on success.
function expandGroup(req, group) {
  if (!group || typeof group !== 'object') return 'group is required'
  const coords = group.startingCoordinates
  if (!Array.isArray(coords) || coords.length === 0) {
    return 'group.startingCoordinates is required and must be a non-empty array'
  }
  for (let i = 0; i < coords.length; i++) {
    if (!isCoordinate(coords[i])) {
      return `group.startingCoordinates[${i}] must be { latitude, longitude } coordinates`
    }
  }
  for (const field of ['interestTags', 'foodPrefs', 'diet']) {
    if (group[field] !== undefined && !isStringArray(group[field])) {
      return `group.${field} must be an array of strings`
    }
  }

  req.body.members = coords.map((startLocation, i) => ({
    name: `Member ${i + 1}`,
    startLocation,
    interestTags: group.interestTags ?? [],
    foodPrefs: group.foodPrefs ?? [],
    diet: group.diet ?? [],
  }))
  return null
}

function validateRecommendationInput(req, res, next) {
  const { trip, members, group } = req.body ?? {}

  const tripError = validateTrip(trip)
  if (tripError) return res.status(400).json({ error: tripError })

  // Accept either an explicit `members` array or the wizard's `group` shape
  // (expanded into members here). `members` wins if both are sent.
  if (members === undefined && group !== undefined) {
    const groupError = expandGroup(req, group)
    if (groupError) return res.status(400).json({ error: groupError })
  } else {
    const membersError = validateMembers(members)
    if (membersError) return res.status(400).json({ error: membersError })
  }

  next()
}

export { validateRecommendationInput }
