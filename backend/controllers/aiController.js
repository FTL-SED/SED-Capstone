import { generateItinerary } from '../services/ai/index.js'
import { persistItinerary } from '../services/itinerary/persist.js'

// POST /ai-agent
// Takes the recommendation engine's output ({ shortlist, constraints }),
// generates a sequenced one-day itinerary, and persists it for the caller.
// Thin per .claude/rules/backend.md — all sequencing/validation/fallback logic
// lives in services/ai, all translation/persistence in services/itinerary.
// Auth is handled by requireAuth (req.user is the caller's User row).
// A calendar date the persistence layer can safely combine with a stop's
// "HH:MM" into a DateTime. Must be YYYY-MM-DD AND a real date — a malformed
// string would otherwise reach `new Date(...)` in persist.js and silently
// become an Invalid Date, corrupting the stored timestamps.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
function isValidTripDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

async function postAiAgent(req, res) {
  const { shortlist, constraints, tripDate, isPublic, title, description, members } = req.body ?? {}

  if (!Array.isArray(shortlist) || shortlist.length === 0) {
    return res.status(400).json({ error: 'shortlist is required and must be a non-empty array' })
  }
  if (!constraints || typeof constraints !== 'object') {
    return res.status(400).json({ error: 'constraints is required' })
  }
  // Optional, but if present it must be a real YYYY-MM-DD (see isValidTripDate).
  if (tripDate !== undefined && !isValidTripDate(tripDate)) {
    return res.status(400).json({ error: 'tripDate must be a valid "YYYY-MM-DD" date' })
  }
  // Optional: the group the plan was built for, persisted so a saved itinerary
  // can show/edit its members. Only validated loosely here (the recommendation
  // step already validated the same members); absent ⇒ no member rows.
  if (members !== undefined && !Array.isArray(members)) {
    return res.status(400).json({ error: 'members must be an array when provided' })
  }

  try {
    const result = await generateItinerary(shortlist, constraints)

    // Constraints too tight for any itinerary — a valid outcome, not an error.
    if (result.feasible === false) {
      return res.status(200).json({ feasible: false, reason: result.reason })
    }

    const saved = await persistItinerary(result.itinerary, shortlist, {
      userId: req.user.id,
      tripDate,
      isPublic: isPublic === true,
      title: typeof title === 'string' ? title : undefined,
      description: typeof description === 'string' ? description : undefined,
      constraints,
      members,
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
