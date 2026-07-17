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

// Build the Pin.create rows from the itinerary's stops. Array index becomes
// orderInItinerary; the shortlist supplies the display fields by pinId.
function stopsToPins(stops, shortlist, dayISO) {
  const byId = new Map(shortlist.map((p) => [p.id, p]))
  const offset = pacificOffset(dayISO)

  return stops.map((stop, i) => {
    const pin = byId.get(stop.pinId)
    if (!pin) {
      // Validation (Step 4) guarantees every pinId is in the shortlist, so
      // this only fires on a caller passing a mismatched shortlist.
      throw new Error(`stop references pinId ${stop.pinId} not in the shortlist`)
    }

    // mealType has no Pin column; fold it into tags so it survives to the
    // frontend (which can badge "lunch") without a schema migration.
    const tags = stop.mealType ? [...(pin.tags ?? []), stop.mealType] : pin.tags ?? []

    return {
      orderInItinerary: i,
      name: pin.name,
      description: stop.note ?? pin.description ?? null,
      tags,
      rating: pin.rating ?? null,
      // Cost is a fact about the place, taken from the shortlist pin — the stop
      // only sequences, it never carries a price (see config/ai.js STOP_SCHEMA).
      pricePerPerson: pin.pricePerPerson ?? 0,
      latitude: pin.latitude,
      longitude: pin.longitude,
      address: pin.address ?? null,
      startTime: toDateTime(dayISO, stop.arriveTime, offset),
      endTime: toDateTime(dayISO, stop.departTime, offset),
      travelTimeToNextMinutes: stop.travelTimeToNextMinutes ?? null,
      distanceToNextMeters: stop.distanceToNextMeters ?? null,
      locationImageUrl: pin.locationImageUrl,
    }
  })
}

// Persist a generated itinerary for a user.
//   itinerary = { title, location, description, stops[] } (feasible AI/fallback output)
//   shortlist = the pins it was built from (for pinId -> display re-hydration)
//   opts      = { userId, tripDate?: 'YYYY-MM-DD', isPublic? }
// Returns the created Itinerary with its creator + ordered pins (itineraryInclude).
async function persistItinerary(itinerary, shortlist, { userId, tripDate, isPublic = false, title, description }) {
  // Default to the trip date; fall back to a fixed date if none supplied (the
  // clock times are what matter — the calendar day is cosmetic for a one-day trip).
  const dayISO = tripDate ?? '2026-01-01'
  const pins = stopsToPins(itinerary.stops, shortlist, dayISO)

  // Prefer a user-supplied title/description (from the wizard's finish step)
  // over the AI-generated one; fall back to the AI's when the user leaves them blank.
  const finalTitle = typeof title === 'string' && title.trim() ? title.trim() : itinerary.title
  const finalDescription =
    typeof description === 'string' && description.trim() ? description.trim() : itinerary.description ?? null

  return itineraries.create({
    userId,
    title: finalTitle,
    location: itinerary.location,
    description: finalDescription,
    coverImageUrl: pins.length > 0 ? pins[0].locationImageUrl : null,
    isPublic,
    pins: { create: pins },
  })
}

export { persistItinerary, stopsToPins, toDateTime, pacificOffset }
