// Builds the two chat messages we send to the AI: a "system" message with the
// fixed rules, and a "user" message with this trip's places and constraints.
// Takes the shortlist + constraints, returns the `messages` array the client
// sends to the model.
import { MEAL_TIME_WINDOWS, AVG_STOP_DURATION_MIN } from '../../../config/ai.js'
import { windowLengthMinutes } from '../../../utils/time.js'

// Caps on the user-controllable text that reaches the model. Pins can be
// user-created (POST /pins), so name/tags are untrusted input; length-capping
// bounds any prompt-injection payload (the system prompt + pinId-only output
// validation already contain the blast radius to "rejected → fallback").
const MAX_NAME_LEN = 120
const MAX_TAGS = 12
const MAX_TAG_LEN = 40

const cap = (value, max) => (typeof value === 'string' ? value.slice(0, max) : value)

// Only the fields the model needs to sequence — trims the pin so the prompt
// stays small and the model can't be distracted by internals (scores, flags).
// openingHours is passed but flagged as a soft hint (see the system prompt).
const toPromptPin = (pin) => ({
  id: pin.id,
  name: cap(pin.name, MAX_NAME_LEN),
  category: pin.category,
  // The venue's descriptive tags for the model's context. mapVenue exposes the
  // split fields (not a combined `tags`), so reconstruct a tag list from them.
  // Capped in count and length since pins can be user-authored.
  tags: [...(pin.interests ?? []), ...(pin.cuisine ?? []), ...(pin.diet ?? [])]
    .slice(0, MAX_TAGS)
    .map((t) => cap(t, MAX_TAG_LEN)),
  latitude: pin.latitude,
  longitude: pin.longitude,
  pricePerPerson: pin.pricePerPerson,
  openingHours: pin.openingHours,
})

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
  '- When a transport mode is given, account for its pace: walking/biking cover less ground than transit/driving, so keep stops closer together and allow more travel time on foot.',
  '- When foodBelowMin is true, meal options in range are scarce — prioritise keeping the few restaurants you do have rather than dropping them.',
  `- Meal windows (Pacific, HH:MM): breakfast ${MEAL_TIME_WINDOWS.breakfast.start}-${MEAL_TIME_WINDOWS.breakfast.end}, lunch ${MEAL_TIME_WINDOWS.lunch.start}-${MEAL_TIME_WINDOWS.lunch.end}, dinner ${MEAL_TIME_WINDOWS.dinner.start}-${MEAL_TIME_WINDOWS.dinner.end}. Tag a meal stop with the matching mealType.`,
  "- The chosen stops' combined pricePerPerson must not exceed maxBudgetPerPerson. Drop stops to stay within it; you don't output cost, we read each place's price from the shortlist.",
  '- Keep every arriveTime/departTime inside the trip time window, in chronological order.',
  '',
  'DAY COVERAGE — these are hard requirements, not suggestions:',
  '- Schedule stops for the ENTIRE time window. The FIRST stop must arrive at (or within ~15 min of) the window start, and the LAST stop must depart within one stop-length of the window end — not hours before it.',
  '- Aim for the target number of stops given in the constraints (targetStops). Use that many shortlist places unless budget or opening hours genuinely forbid it. More real stops is better than a short day.',
  '- No dead air: the gap between one stop departing and the next arriving is travel time only. Never leave an idle gap larger than ~30 min; if you would, insert another shortlist place instead.',
  '- Do NOT end the day early while unused shortlist places remain and time is left in the window. Prefer adding a place over stopping.',
  '- When includeMeals is not false, place a meal (a restaurant, tagged with its mealType) in EACH meal window the trip overlaps. Only skip a meal window if no suitable restaurant is provided in the shortlist.',
  '',
  'Before you output, VERIFY and fix your own draft:',
  '  1. Does the last stop depart within one stop-length of the window end? If not, add stops until it does.',
  '  2. Is every required meal window filled with a mealType-tagged restaurant? If not, add one.',
  '  3. Are there any idle gaps > ~30 min? If so, fill them with unused shortlist places.',
  'Only emit the itinerary once all three checks pass (or you have genuinely run out of places/budget).',
  '',
  'Output: a single JSON object, no prose, matching exactly:',
  '{',
  '  "feasible": true,',
  '  "title": string, "location": string, "description": string,',
  '  "stops": [{',
  '    "pinId": integer (from the shortlist),',
  '    "arriveTime": "HH:MM", "departTime": "HH:MM",',
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
const buildUserMessage = (shortlist, constraints) => {
  const {
    timeWindow, maxBudgetPerPerson, groupSize,
    meetingPoint, travelRadius, transport, maxMemberDistance, foodBelowMin, includeMeals,
  } = constraints ?? {}

  // startingCoordinates are intentionally omitted — the model anchors on
  // meetingPoint (a single fair point), not raw per-member lat/long pairs.
  const details = { maxBudgetPerPerson, groupSize }
  if (timeWindow) details.timeWindow = timeWindow
  if (meetingPoint) details.meetingPoint = meetingPoint
  if (travelRadius != null) details.travelRadius = travelRadius
  if (transport) details.transport = transport
  if (maxMemberDistance != null) details.maxMemberDistance = maxMemberDistance
  if (foodBelowMin) details.foodBelowMin = foodBelowMin

  // Give the model a concrete coverage target: how many ~AVG_STOP_DURATION_MIN
  // stops fit the window. This is what turns "fill the day" from advice into a
  // number it can aim at and self-check against. Omit when the window is
  // unknown (the prompt still works, just without the numeric target).
  if (timeWindow?.startTime && timeWindow?.endTime) {
    const windowLen = windowLengthMinutes(timeWindow.startTime, timeWindow.endTime)
    if (windowLen > 0) {
      details.targetStops = Math.max(1, Math.floor(windowLen / AVG_STOP_DURATION_MIN))
    }
  }
  if (includeMeals === false) details.includeMeals = false

  return [
    'Constraints:',
    JSON.stringify(details, null, 2),
    '',
    'Shortlist (sequence these):',
    JSON.stringify(shortlist.map(toPromptPin), null, 2),
  ].join('\n')
}

// Assemble the chat messages array for one sequencing call.
const buildMessages = (shortlist, constraints) => [
  { role: 'system', content: SYSTEM_PROMPT },
  { role: 'user', content: buildUserMessage(shortlist, constraints) },
]

export { buildMessages, SYSTEM_PROMPT, toPromptPin }
