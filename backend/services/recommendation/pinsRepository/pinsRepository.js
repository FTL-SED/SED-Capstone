// Bridges the seeded `Pin` rows — the app's only pin data today, see
// ../../../../.claude/docs/database-schema.md — into the plain pin shape
// the recommendation engine expects (see helpers/helpers.js's assumed shape).
//
// Pin has no dedicated category/cuisine/diet/openingHours columns (only
// `rating` was added — see the roadmap's Step 9 decision log). Instead:
//   - category/cuisine/diet are all derived from the free-form `tags` array
//     via the shared vocab in ../../../config/tagVocab.js.
//   - openingHours is approximated from the Pin's own scheduled
//     startTime/endTime, since no real business-hours data exists yet.
import prisma from '../../../lib/prisma.js'
import { FOOD_INDICATOR_TAGS, CUISINE_TAGS, DIET_TAGS } from '../../../config/tagVocab.js'

// Pin.startTime/endTime are stored as bare UTC instants (TIMESTAMP(3), no
// tz) representing SF-local wall-clock times. Always read them back through
// this specific zone — never `.getHours()`, which is server-timezone
// dependent and will silently give the wrong answer off a Pacific-time box.
const PACIFIC_HHMM = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function toPacificHHMM(date) {
  return PACIFIC_HHMM.format(date)
}

// Pure: Pin -> pin. No DB access, so it's directly unit-testable.
function mapPin(pin) {
  const tags = pin.tags ?? []
  const cuisineMatches = tags.filter((tag) => CUISINE_TAGS.has(tag))
  const dietMatches = tags.filter((tag) => DIET_TAGS.has(tag))

  const isFoodPin =
    tags.some((tag) => FOOD_INDICATOR_TAGS.has(tag)) ||
    cuisineMatches.length > 0 ||
    dietMatches.length > 0
  const category = isFoodPin ? 'restaurant' : 'activity'

  return {
    id: pin.id,
    name: pin.name,
    category,
    tags,
    cuisine: cuisineMatches.length > 0 ? cuisineMatches : undefined,
    // Absence of a diet tag means "we don't know", NOT "confirmed to serve
    // none" - must stay undefined (never []) so passesDiet's missing-data
    // ⇒ keep rule applies. See helpers/helpers.js.
    diet: dietMatches.length > 0 ? dietMatches : undefined,
    rating: pin.rating ?? undefined,
    pricePerPerson: pin.pricePerPerson,
    latitude: pin.latitude,
    longitude: pin.longitude,
    address: pin.address,
    locationImageUrl: pin.locationImageUrl,
    // Proxy for real business hours (which don't exist yet): the window this
    // Pin happened to be scheduled in on whatever itinerary it came from.
    // Weak positive evidence at best - a pin open all day but only ever
    // visited 9-10am would look closed outside that window. See the Known
    // Limitations note in ../../../../.claude/roadmap/recommendation-engine.md.
    openingHours: [{ open: toPacificHHMM(pin.startTime), close: toPacificHHMM(pin.endTime) }],
  }
}

// A real-world pin can appear as a Pin in more than one itinerary. Dedupe
// by name + coordinates so it isn't offered to the engine twice.
function dedupePins(pins) {
  const seen = new Set()
  const deduped = []

  for (const pin of pins) {
    const key = `${pin.name}|${pin.latitude}|${pin.longitude}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(pin)
  }

  return deduped
}

// Every Pin on a PUBLIC itinerary doubles as the seeded pin catalog for
// now (see the Step 9 decision log in the roadmap) — there is no separate
// pin-catalog table. Scoped to `itinerary.isPublic: true` so a private
// draft's pins never leak into someone else's recommendations (that
// leaked previously — see the Known Limitations fix log in the roadmap).
async function getAllPins() {
  const pins = await prisma.pin.findMany({
    where: { itinerary: { isPublic: true } },
  })
  return dedupePins(pins).map(mapPin)
}

export { mapPin, dedupePins, getAllPins, toPacificHHMM }
