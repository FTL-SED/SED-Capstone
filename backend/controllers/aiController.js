import { generateItinerary } from '../services/ai/index.js'
import { persistItinerary } from '../services/itinerary/persist.js'

// POST /ai-agent
// Takes the recommendation engine's output ({ shortlist, constraints }),
// generates a sequenced one-day itinerary, and persists it for the caller.
// Thin per .claude/rules/backend.md — all sequencing/validation/fallback logic
// lives in services/ai, all translation/persistence in services/itinerary.
// Auth is handled by requireAuth (req.user is the caller's User row).
async function postAiAgent(req, res) {
  const { shortlist, constraints, tripDate, isPublic } = req.body ?? {}

  if (!Array.isArray(shortlist) || shortlist.length === 0) {
    return res.status(400).json({ error: 'shortlist is required and must be a non-empty array' })
  }
  if (!constraints || typeof constraints !== 'object') {
    return res.status(400).json({ error: 'constraints is required' })
  }

  try {
    const result = await generateItinerary(shortlist, constraints)

    // Constraints too tight for any itinerary — a valid outcome, not an error.
    if (result.feasible === false) {
      return res.status(200).json({ feasible: false, reason: result.reason })
    }

    const saved = await persistItinerary(result.itinerary, shortlist, {
      userId: req.user.id,
      tripDate: typeof tripDate === 'string' ? tripDate : undefined,
      isPublic: isPublic === true,
    })

    // Return the persisted itinerary (with id + ordered pins) so the frontend
    // can render it immediately or fetch it later via GET /itineraries/:id.
    return res.status(201).json({ itinerary: saved, source: result.source })
  } catch (err) {
    console.error('POST /ai-agent failed:', err)
    return res.status(500).json({ error: 'Failed to generate itinerary' })
  }
}

export { postAiAgent }
