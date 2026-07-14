import { getRecommendations } from '../services/recommendation/index.js'

// POST /recommendations
// Thin per .claude/rules/backend.md — input is already validated by
// validateRecommendationInput middleware; all scoring logic lives in the
// recommendation service. Returns the ranked shortlist + constraints that
// the (future) AI sequencing step at POST /ai-agent will consume.
async function postRecommendations(req, res) {
  const { trip, members } = req.body

  const result = await getRecommendations(trip, members)

  return res.status(200).json(result)
}

export { postRecommendations }
