// Validates the constraints payload for POST /recommendations before it
// reaches the controller, per .claude/rules/backend.md → Middleware.
// Shape expected by recommend(trip, members, places):
//   trip:    { startTime: 'HH:MM', endTime: 'HH:MM', maxBudgetPerPerson: number }
//   members: [{ name, startLocation?, interestTags?[], foodPrefs?[], diet?[] }]
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function isStringArray(value) {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

function validateTrip(trip) {
  if (!trip || typeof trip !== 'object') return 'trip is required'
  if (typeof trip.startTime !== 'string' || !TIME_RE.test(trip.startTime)) {
    return 'trip.startTime is required and must be an "HH:MM" string'
  }
  if (typeof trip.endTime !== 'string' || !TIME_RE.test(trip.endTime)) {
    return 'trip.endTime is required and must be an "HH:MM" string'
  }
  if (typeof trip.maxBudgetPerPerson !== 'number' || trip.maxBudgetPerPerson < 0) {
    return 'trip.maxBudgetPerPerson is required and must be a non-negative number'
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
