// Bridges the seeded `Pin` rows — the app's only place data today, see
// ../../../../.claude/docs/database-schema.md — into the plain place shape
// the recommendation engine expects (see helpers/helpers.js's assumed shape).
//
// Pin has no category/cuisine/diet/priceLevel/openingHours/rating columns.
// Per the team's decision, we don't add them to the schema: cuisine, diet,
// rating, and openingHours are simply always "unknown" to the engine, which
// already has first-class handling for that (flags + graceful defaults, see
// filters/filters.js and score/score.js). `category` still has to be derived
// from `tags`, since the engine needs it to separate the meal pool from
// activities — Step 0's INTEREST_MAP/CUISINE_MAP canonical vocab is still
// open, so this is a minimal interim stand-in, not that vocab.
import prisma from '../../../lib/prisma.js'

const FOOD_TAGS = new Set(['food'])

// Pure: Pin -> place. No DB access, so it's directly unit-testable.
function mapPinToPlace(pin) {
  const tags = pin.tags ?? []
  const category = tags.some((tag) => FOOD_TAGS.has(tag)) ? 'restaurant' : 'activity'

  return {
    id: pin.id,
    name: pin.name,
    category,
    tags,
    pricePerPerson: pin.pricePerPerson,
    latitude: pin.latitude,
    longitude: pin.longitude,
    address: pin.address,
    locationImageUrl: pin.locationImageUrl,
  }
}

// A real-world place can appear as a Pin in more than one itinerary. Dedupe
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

// Every Pin ever created, across all itineraries, doubles as the seeded
// place catalog for now (see the Step 9 decision log in the roadmap) — there
// is no separate place-catalog table.
async function getAllPlaces() {
  const pins = await prisma.pin.findMany()
  return dedupePins(pins).map(mapPinToPlace)
}

export { mapPinToPlace, dedupePins, getAllPlaces }
