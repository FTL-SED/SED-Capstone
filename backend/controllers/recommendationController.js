import { getRecommendations } from '../services/recommendation/index.js'

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
