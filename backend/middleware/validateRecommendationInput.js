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
// Each member carries their OWN interests/food/diet, so the engine's coverage
// score + fairness guarantee have real per-person signal to work with (a shared
// group blob would make every member identical, collapsing coverage to
// all-or-nothing and making the fairness pass a no-op). The frontend wizard
// sends this members array directly.
import { TRANSPORT_MODES } from '../config/ai.js'

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
  // endTime == startTime is the only degenerate case (a zero-length or full-24h
  // window). endTime < startTime is allowed and means the trip crosses midnight
  // (e.g. 22:00 → 02:00 for a late-night plan); the engine anchors all its time
  // math on startTime so after-midnight times sort correctly.
  const [sh, sm] = trip.startTime.split(':').map(Number)
  const [eh, em] = trip.endTime.split(':').map(Number)
  if (eh * 60 + em === sh * 60 + sm) {
    return 'trip.endTime must differ from trip.startTime'
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
  // transport is optional; if present it must be one of the known modes (the
  // engine falls back to a default speed for anything else, so reject unknowns).
  if (trip.transport !== undefined && !TRANSPORT_MODES.includes(trip.transport)) {
    return `trip.transport must be one of: ${TRANSPORT_MODES.join(', ')}`
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

function validateRecommendationInput(req, res, next) {
  const { trip, members } = req.body ?? {}

  const tripError = validateTrip(trip)
  if (tripError) return res.status(400).json({ error: tripError })

  const membersError = validateMembers(members)
  if (membersError) return res.status(400).json({ error: membersError })

  next()
}

export { validateRecommendationInput }
