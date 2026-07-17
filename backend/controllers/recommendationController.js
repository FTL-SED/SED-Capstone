import { getRecommendations } from '../services/recommendation/index.js'

// A human-readable hint for why no places matched, tailored to the most likely
// culprit so the frontend can guide the user (rather than showing an empty
// screen). travelRadius + budget are the two constraints that most often
// starve the shortlist; otherwise it's a thin catalog for the interests.
function emptyReason(trip) {
  if (typeof trip?.travelRadius === 'number') {
    return 'No places found within your travel radius. Try increasing the radius or budget.'
  }
  if (typeof trip?.maxBudgetPerPerson === 'number' && trip.maxBudgetPerPerson < 10) {
    return 'No places fit this budget. Try raising the per-person budget.'
  }
  return 'No places matched this group. Try adding interests, raising the budget, or widening the time window.'
}

// POST /recommendations
// Thin per .claude/rules/backend.md — caller is already authenticated by
// requireAuth and input is already validated by validateRecommendationInput;
// all scoring logic lives in the recommendation service. Returns the ranked
// shortlist + constraints that the AI sequencing step at POST /ai-agent
// consumes.
async function postRecommendations(req, res) {
  const { trip, members } = req.body

  try {
    const result = await getRecommendations(trip, members)

    // No matches is a normal outcome, not an error — return 200 with an empty
    // shortlist and a `reason` the frontend can surface, rather than letting an
    // empty shortlist flow into POST /ai-agent (which rejects it with a 400).
    if (result.shortlist.length === 0) {
      return res.status(200).json({ ...result, reason: emptyReason(trip) })
    }
    return res.status(200).json(result)
  } catch (err) {
    // Without this, an unreachable DB or a bug deep in the recommendation
    // service falls through to Express's default handler — a generic HTML
    // error page instead of a JSON response the frontend can parse.
    console.error('POST /recommendations failed:', err)
    return res.status(500).json({ error: 'Failed to generate recommendations' })
  }
}

export { postRecommendations }
