// Step 3 — prompt engineering. Builds the system + user messages that instruct
// the model to ORDER the recommendation shortlist into a one-day schedule.
// Pure: shortlist + constraints in, OpenRouter `messages` array out.
import { MEAL_TIME_WINDOWS } from '../../config/ai.js'

// Only the fields the model needs to sequence — trims the pin so the prompt
// stays small and the model can't be distracted by internals (scores, flags).
// openingHours is passed but flagged as a soft hint (see the system prompt).
function toPromptPin(pin) {
  return {
    id: pin.id,
    name: pin.name,
    category: pin.category,
    tags: pin.tags,
    latitude: pin.latitude,
    longitude: pin.longitude,
    pricePerPerson: pin.pricePerPerson,
    openingHours: pin.openingHours,
  }
}

// The fixed rulebook. Independent of any specific trip, so it's a constant.
const SYSTEM_PROMPT = [
  'You are an itinerary sequencer. Your job is to ORDER the provided places into a sensible one-day schedule.',
  '',
  'Rules:',
  '- Do NOT invent new places. Use ONLY the pinId values from the provided shortlist.',
  "- Do NOT remove places unless they don't fit the time window or budget.",
  '- Anchor the day near the provided meetingPoint when given: the first stop should be at or close to it so the group converges fairly.',
  '- openingHours is a WEAK hint (the window a place happened to be scheduled in, not verified business hours). Treat it as soft guidance, not a hard constraint.',
  '- Order stops geographically to minimize backtracking, and place meals at natural meal times.',
  `- Meal windows (Pacific, HH:MM): breakfast ${MEAL_TIME_WINDOWS.breakfast.start}-${MEAL_TIME_WINDOWS.breakfast.end}, lunch ${MEAL_TIME_WINDOWS.lunch.start}-${MEAL_TIME_WINDOWS.lunch.end}, dinner ${MEAL_TIME_WINDOWS.dinner.start}-${MEAL_TIME_WINDOWS.dinner.end}. Tag a meal stop with the matching mealType.`,
  '- Total per-person cost across all stops must not exceed maxBudgetPerPerson.',
  '- Keep every arriveTime/departTime inside the trip time window, in chronological order.',
  '',
  'Output: a single JSON object, no prose, matching exactly:',
  '{',
  '  "feasible": true,',
  '  "title": string, "location": string, "description": string,',
  '  "stops": [{',
  '    "pinId": integer (from the shortlist),',
  '    "arriveTime": "HH:MM", "departTime": "HH:MM",',
  '    "estimatedCostPerPerson": number,',
  '    "mealType": "breakfast" | "lunch" | "dinner" (optional, meals only),',
  '    "note": string (optional),',
  '    "travelTimeToNextMinutes": integer or null, "distanceToNextMeters": number or null',
  '  }]',
  '}',
  'Stops must be in visit order (array position IS the schedule order).',
  'If NO feasible itinerary fits the time/budget constraints, return instead: { "feasible": false, "reason": string }.',
].join('\n')

// Renders the per-trip data. Optional constraints (timeWindow, meetingPoint,
// travelRadius) are included only when present — so the prompt works today and
// improves once the recommendation engine supplies them.
function buildUserMessage(shortlist, constraints) {
  const { timeWindow, maxBudgetPerPerson, groupSize, startingLocations, meetingPoint, travelRadius } =
    constraints ?? {}

  const details = { maxBudgetPerPerson, groupSize, startingLocations }
  if (timeWindow) details.timeWindow = timeWindow
  if (meetingPoint) details.meetingPoint = meetingPoint
  if (travelRadius != null) details.travelRadius = travelRadius

  return [
    'Constraints:',
    JSON.stringify(details, null, 2),
    '',
    'Shortlist (sequence these):',
    JSON.stringify(shortlist.map(toPromptPin), null, 2),
  ].join('\n')
}

// Assemble the OpenRouter messages array for one sequencing call.
function buildMessages(shortlist, constraints) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserMessage(shortlist, constraints) },
  ]
}

export { buildMessages, SYSTEM_PROMPT }
