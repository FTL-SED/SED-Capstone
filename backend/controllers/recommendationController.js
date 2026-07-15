import { getRecommendations } from '../services/recommendation/index.js'

// POST /recommendations
// Thin per .claude/rules/backend.md — caller is already authenticated by
// requireAuth and input is already validated by validateRecommendationInput;
// all scoring logic lives in the recommendation service. Returns the ranked
// shortlist + constraints that the (future) AI sequencing step at
// POST /ai-agent will consume.
async function postRecommendations(req, res) {
  const { trip, members } = req.body

  try {
    const result = await getRecommendations(trip, members)
    return res.status(200).json(result)
  } catch (err) {
    // A member's address couldn't be geocoded — that's bad user input, not a
    // server fault, so surface the specific message as 422 for the organizer
    // to fix rather than a generic 500.
    if (err.code === 'GEOCODE_FAILED') {
      return res.status(422).json({ error: err.message })
    }
    // Without this, an unreachable DB or a bug deep in the recommendation
    // service falls through to Express's default handler — a generic HTML
    // error page instead of a JSON response the frontend can parse.
    console.error('POST /recommendations failed:', err)
    return res.status(500).json({ error: 'Failed to generate recommendations' })
  }
}

export { postRecommendations }
