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
import { toMinutes } from '../../utils/time.js'
import { TRANSPORT_MODES } from '../../config/ai.js'

// Add N days to a YYYY-MM-DD string, returning YYYY-MM-DD. Used to roll a stop
// onto the next calendar day when an overnight schedule passes midnight.
function addDaysISO(dayISO, days) {
  const d = new Date(`${dayISO}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

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
//
// Stops are in chronological order but carry only wall-clock "HH:MM", so an
// overnight plan (e.g. 22:00 → 00:30) would otherwise persist endTime BEFORE
// startTime. We walk the stops tracking the running wall-clock: whenever a time
// is earlier than the previous one, the day has rolled over to the next
// calendar day, so we advance the date used to build that DateTime. This keeps
// every persisted DateTime monotonically increasing across midnight.
function stopsToStops(stops, shortlist, dayISO) {
  const byId = new Map(shortlist.map((p) => [p.id, p]))

  // The day rolls forward each time a wall-clock time is < the previous one.
  let dayOffset = 0
  let prevMin = -1
  // Advance dayOffset if this time wrapped past midnight vs the previous one,
  // then return the DateTime on the correct calendar day (DST-safe offset).
  const build = (hhmm) => {
    const m = toMinutes(hhmm)
    if (m < prevMin) dayOffset += 1
    prevMin = m
    const day = dayOffset === 0 ? dayISO : addDaysISO(dayISO, dayOffset)
    return toDateTime(day, hhmm, pacificOffset(day))
  }

  return stops.map((stop, i) => {
    const pin = byId.get(stop.pinId)
    if (!pin) {
      // Validation (Step 4) guarantees every pinId is in the shortlist, so
      // this only fires on a caller passing a mismatched shortlist.
      throw new Error(`stop references pinId ${stop.pinId} not in the shortlist`)
    }

    // Build arrive then depart in order so a within-stop midnight cross (arrive
    // 23:40, depart 00:10) also rolls the day for departTime.
    const startTime = build(stop.arriveTime)
    const endTime = build(stop.departTime)

    return {
      pinId: stop.pinId, // reference the catalog venue pin
      orderInItinerary: i,
      startTime,
      endTime,
      mealType: stop.mealType ?? null,
      note: stop.note ?? null,
      travelTimeToNextMinutes: stop.travelTimeToNextMinutes ?? null,
      distanceToNextMeters: stop.distanceToNextMeters ?? null,
    }
  })
}

// Map the recommendation engine's `constraints` object onto the Itinerary's
// TRIP-LEVEL constraint columns, so a saved itinerary is self-describing (budget
// display, US #1) and editable (US #7). Every field is optional — an absent
// constraint stays null. Group interests/food/diets and groupSize are NOT stored
// here: they derive from the persisted members (see memberRows), so there's a
// single source of truth. tripDate is passed separately (the API's own field).
function constraintColumns(constraints, tripDate) {
  const c = constraints ?? {}
  const mp = c.meetingPoint ?? {}

  // Both-or-neither: a half-set window (start without end, or vice versa) is a
  // window no consumer can bound, so persist it only when BOTH are present —
  // otherwise store neither. Same for the meeting point coordinate pair.
  const start = c.timeWindow?.startTime
  const end = c.timeWindow?.endTime
  const hasWindow = typeof start === 'string' && typeof end === 'string'
  const hasMeetingPoint = typeof mp.latitude === 'number' && typeof mp.longitude === 'number'

  return {
    // A date-only column (@db.Date). Build at UTC midnight and hand Prisma the
    // Date; @db.Date stores just the calendar day, so no TZ shift on read.
    tripDate: tripDate ? new Date(`${tripDate}T00:00:00Z`) : null,
    dayStart: hasWindow ? start : null,
    dayEnd: hasWindow ? end : null,
    maxBudgetPerPerson: typeof c.maxBudgetPerPerson === 'number' ? c.maxBudgetPerPerson : null,
    travelRadius: typeof c.travelRadius === 'number' ? c.travelRadius : null,
    // Only persist a transport the engine actually understands; drop unknowns
    // to null rather than let the column violate its implied enum.
    transport: TRANSPORT_MODES.includes(c.transport) ? c.transport : null,
    meetingPointLat: hasMeetingPoint ? mp.latitude : null,
    meetingPointLng: hasMeetingPoint ? mp.longitude : null,
  }
}

// Build ItineraryMember.create rows from the group the plan was built for. Each
// member keeps their name, resolved start location, and preference tags so a
// saved itinerary can show/edit the actual group (not just the aggregate).
function memberRows(members) {
  if (!Array.isArray(members)) return []
  return members.map((m) => {
    const loc = m.startLocation ?? m.location ?? {}
    // Both-or-neither: a lone lat (or lng) is useless for the meeting-point math
    // and misleading on the map, so store the coordinate pair only when complete.
    const hasCoords = typeof loc.latitude === 'number' && typeof loc.longitude === 'number'
    return {
      name: typeof m.name === 'string' && m.name.trim() ? m.name.trim() : 'Member',
      startLabel: loc.label ?? null,
      startLat: hasCoords ? loc.latitude : null,
      startLng: hasCoords ? loc.longitude : null,
      interestTags: Array.isArray(m.interestTags) ? m.interestTags : [],
      foodPrefs: Array.isArray(m.foodPrefs) ? m.foodPrefs : [],
      diets: Array.isArray(m.diet) ? m.diet : [],
    }
  })
}

// Persist a generated itinerary for a user.
//   itinerary = { title, location, description, stops[] } (feasible AI/fallback output)
//   shortlist = the pins it was built from (catalog venue pins with real ids)
//   opts      = { userId, tripDate?: 'YYYY-MM-DD', isPublic?, constraints?, members? }
// Returns the created Itinerary with its creator + ordered stops (itineraryInclude).
async function persistItinerary(itinerary, shortlist, { userId, tripDate, isPublic = false, title, description, constraints, members }) {
  // Default to the trip date; fall back to a fixed date if none supplied (the
  // clock times are what matter — the calendar day is cosmetic for a one-day trip).
  const dayISO = tripDate ?? '2026-01-01'
  const stops = stopsToStops(itinerary.stops, shortlist, dayISO)

  // Prefer a user-supplied title/description (from the wizard's finish step)
  // over the AI-generated one; fall back to the AI's when the user leaves them blank.
  const finalTitle = typeof title === 'string' && title.trim() ? title.trim() : itinerary.title
  const finalDescription =
    typeof description === 'string' && description.trim() ? description.trim() : itinerary.description ?? null

  // Cover image is set only by an explicit user upload (POST /itineraries/:id/cover);
  // default to null so the banner shows the branded gradient fallback.
  const coverImageUrl = null

  const memberCreate = memberRows(members)

  return itineraries.create({
    userId,
    title: finalTitle,
    location: itinerary.location,
    description: finalDescription,
    coverImageUrl,
    isPublic,
    ...constraintColumns(constraints, tripDate),
    stops: { create: stops },
    ...(memberCreate.length > 0 ? { members: { create: memberCreate } } : {}),
  })
}

export { persistItinerary, stopsToStops, toDateTime, pacificOffset, memberRows, constraintColumns }
