// Step 8 — persist a generated itinerary. Translates the AI/fallback output
// (config/ai.js ITINERARY_SCHEMA: title/location/description + stops carrying
// pinId + "HH:MM" times) into an Itinerary row plus ordered Pin rows, and
// saves them in one transaction via the itineraries model.
//
// Two translations happen here (the reason this layer exists):
//   1. "HH:MM" -> DateTime  — Pin.startTime/endTime are DateTime columns in
//      Pacific wall-clock (see pinsRepository.js / seed.js). We combine the
//      trip date + the stop's time + the correct Pacific offset for that date.
//   2. re-hydrate the pin   — a stop only carries pinId; the place fields
//      (name, coords, address, image, tags, price) come from the shortlist by id.
import * as itineraries from '../../models/itineraries.js'

// Correct America/Los_Angeles UTC offset ("-07:00" PDT / "-08:00" PST) for a
// given YYYY-MM-DD, so times are DST-safe instead of hardcoding one offset.
function pacificOffset(dayISO) {
  const probe = new Date(`${dayISO}T12:00:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'longOffset',
  }).formatToParts(probe)
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-08:00'
  return name.replace('GMT', '') || '-08:00' // e.g. "-07:00"
}

// Combine a trip day (YYYY-MM-DD) + "HH:MM" into a DateTime at Pacific
// wall-clock — the same interpretation seed.js and pinsRepository.js use.
function toDateTime(dayISO, hhmm, offset) {
  return new Date(`${dayISO}T${hhmm}:00${offset}`)
}

// Build ItineraryStop.create rows from the itinerary's stops. Array index becomes
// orderInItinerary; each stop references its catalog venue pin by pinId.
function stopsToStops(stops, shortlist, dayISO) {
  const byId = new Map(shortlist.map((p) => [p.id, p]))
  const offset = pacificOffset(dayISO)

  return stops.map((stop, i) => {
    const pin = byId.get(stop.pinId)
    if (!pin) {
      // Validation (Step 4) guarantees every pinId is in the shortlist, so
      // this only fires on a caller passing a mismatched shortlist.
      throw new Error(`stop references pinId ${stop.pinId} not in the shortlist`)
    }

    return {
      pinId: stop.pinId, // reference the catalog venue pin
      orderInItinerary: i,
      startTime: toDateTime(dayISO, stop.arriveTime, offset),
      endTime: toDateTime(dayISO, stop.departTime, offset),
      mealType: stop.mealType ?? null,
      note: stop.note ?? null,
      travelTimeToNextMinutes: stop.travelTimeToNextMinutes ?? null,
      distanceToNextMeters: stop.distanceToNextMeters ?? null,
    }
  })
}

// Persist a generated itinerary for a user.
//   itinerary = { title, location, description, stops[] } (feasible AI/fallback output)
//   shortlist = the pins it was built from (catalog venue pins with real ids)
//   opts      = { userId, tripDate?: 'YYYY-MM-DD', isPublic? }
// Returns the created Itinerary with its creator + ordered stops (itineraryInclude).
async function persistItinerary(itinerary, shortlist, { userId, tripDate, isPublic = false, title, description }) {
  // Default to the trip date; fall back to a fixed date if none supplied (the
  // clock times are what matter — the calendar day is cosmetic for a one-day trip).
  const dayISO = tripDate ?? '2026-01-01'
  const stops = stopsToStops(itinerary.stops, shortlist, dayISO)

  // Prefer a user-supplied title/description (from the wizard's finish step)
  // over the AI-generated one; fall back to the AI's when the user leaves them blank.
  const finalTitle = typeof title === 'string' && title.trim() ? title.trim() : itinerary.title
  const finalDescription =
    typeof description === 'string' && description.trim() ? description.trim() : itinerary.description ?? null

  // Cover image derives from the first stop's venue pin
  const byId = new Map(shortlist.map((p) => [p.id, p]))
  const firstVenue = itinerary.stops.length > 0 ? byId.get(itinerary.stops[0].pinId) : null
  const coverImageUrl = firstVenue?.locationImageUrl ?? null

  return itineraries.create({
    userId,
    title: finalTitle,
    location: itinerary.location,
    description: finalDescription,
    coverImageUrl,
    isPublic,
    stops: { create: stops },
  })
}

export { persistItinerary, stopsToStops, toDateTime, pacificOffset }
