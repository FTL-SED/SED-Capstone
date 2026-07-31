import * as pins from '../models/pins.js'
import * as itineraryStops from '../models/itineraryStops.js'
import * as itineraries from '../models/itineraries.js'
import { addStop } from '../services/itinerary/addStop.js'
import { recalcBudget } from '../services/itinerary/recalcBudget.js'
import { parseIdParam, parseDate } from './helpers.js'
import { rangesOverlap } from '../utils/time.js'

// GET /stops
// Browse/search the shared venue catalog so a user can pick a place to add to
// their itinerary. Query params: q (name search), category (restaurant|activity),
// limit, offset, and optional lat/lng/radius (miles) to filter to venues within
// the group's travel radius — supplied all-or-none; each result then carries
// distanceMi. Returns an array of catalog venues (Pins). Auth via requireAuth.
async function searchCatalog(req, res) {
  const { q, category } = req.query
  const limit = Math.min(Number(req.query.limit) || 20, 50)
  const offset = Math.max(Number(req.query.offset) || 0, 0)

  // Geo filter is all-or-none: supplying any of lat/lng/radius requires all
  // three, each finite, with radius > 0. Absent → unfiltered (today's behavior).
  const rawGeo = [req.query.lat, req.query.lng, req.query.radius]
  const geoProvided = rawGeo.some((v) => v !== undefined)
  let geo
  if (geoProvided) {
    const [lat, lng, radius] = rawGeo.map(Number)
    const allFinite = [lat, lng, radius].every(Number.isFinite)
    if (!allFinite || radius <= 0) {
      return res.status(400).json({ error: 'lat, lng, and radius must all be provided as numbers with radius > 0' })
    }
    geo = { lat, lng, radius }
  }

  const venues = await pins.findMany({
    q: typeof q === 'string' && q.trim() ? q.trim() : undefined,
    category: category === 'restaurant' || category === 'activity' ? category : undefined,
    take: limit,
    skip: offset,
    geo,
  })

  return res.status(200).json(venues)
}

// GET /stops/:id
// Returns an itinerary stop with its venue. Readable when the parent itinerary
// is public or owned by the caller. Auth is handled by requireAuth.
async function getStop(req, res) {
  const id = parseIdParam(req, res, 'stop id')
  if (id === null) return

  const stop = await itineraryStops.findByIdWithItinerary(id)

  if (!stop) {
    return res.status(404).json({ error: 'Stop not found' })
  }

  if (!stop.itinerary.isPublic && stop.itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have access to this stop' })
  }

  const { itinerary, ...stopFields } = stop
  return res.status(200).json(stopFields)
}

// POST /stops
// Creates an itinerary stop referencing a venue pin. Accepts either an existing
// pinId (to reference a catalog venue) or inline venue fields (to create a new
// catalog venue first). The caller must own the target itinerary.
async function createStop(req, res) {
  const {
    itineraryId,
    orderInItinerary,
    pinId,
    name,
    description,
    category,
    interests,
    cuisines,
    diets,
    rating,
    pricePerPerson,
    latitude,
    longitude,
    address,
    startTime,
    endTime,
    costPerPerson,
    travelTimeToNextMinutes,
    distanceToNextMeters,
    mealType,
    note,
    locationImageUrl,
  } = req.body

  if (!Number.isInteger(itineraryId)) {
    return res.status(400).json({ error: 'itineraryId is required and must be an integer' })
  }
  if (!Number.isInteger(orderInItinerary) || orderInItinerary < 0) {
    return res.status(400).json({ error: 'orderInItinerary is required and must be a non-negative integer' })
  }

  const parsedStart = parseDate(startTime)
  if (!parsedStart) {
    return res.status(400).json({ error: 'startTime is required and must be a valid date' })
  }
  const parsedEnd = parseDate(endTime)
  if (!parsedEnd) {
    return res.status(400).json({ error: 'endTime is required and must be a valid date' })
  }

  // Optional visit fields
  if (
    travelTimeToNextMinutes !== undefined &&
    travelTimeToNextMinutes !== null &&
    !Number.isInteger(travelTimeToNextMinutes)
  ) {
    return res.status(400).json({ error: 'travelTimeToNextMinutes must be an integer or null' })
  }
  if (
    distanceToNextMeters !== undefined &&
    distanceToNextMeters !== null &&
    (typeof distanceToNextMeters !== 'number' || !Number.isFinite(distanceToNextMeters))
  ) {
    return res.status(400).json({ error: 'distanceToNextMeters must be a number or null' })
  }
  if (mealType !== undefined && mealType !== null && typeof mealType !== 'string') {
    return res.status(400).json({ error: 'mealType must be a string or null' })
  }
  if (note !== undefined && note !== null && typeof note !== 'string') {
    return res.status(400).json({ error: 'note must be a string or null' })
  }
  if (
    costPerPerson !== undefined &&
    costPerPerson !== null &&
    (typeof costPerPerson !== 'number' || !Number.isFinite(costPerPerson) || costPerPerson < 0)
  ) {
    return res.status(400).json({ error: 'costPerPerson must be a non-negative number or null' })
  }

  const itinerary = await itineraries.findByIdBasic(itineraryId)
  if (!itinerary) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }
  if (itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only add pins to your own itineraries' })
  }

  // Build the venue payload (a NEW catalog venue) only when no pinId is given.
  let venue // undefined ⇒ reference the existing pin
  if (!pinId) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name is required when creating a new venue' })
    }
    if (typeof pricePerPerson !== 'number' || !Number.isFinite(pricePerPerson) || pricePerPerson < 0) {
      return res.status(400).json({ error: 'pricePerPerson is required and must be a non-negative number' })
    }
    if (typeof latitude !== 'number' || !Number.isFinite(latitude)) {
      return res.status(400).json({ error: 'latitude is required and must be a number' })
    }
    if (typeof longitude !== 'number' || !Number.isFinite(longitude)) {
      return res.status(400).json({ error: 'longitude is required and must be a number' })
    }

    // Validate optional venue fields
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return res.status(400).json({ error: 'description must be a string or null' })
    }
    if (address !== undefined && address !== null && typeof address !== 'string') {
      return res.status(400).json({ error: 'address must be a string or null' })
    }
    // Structured venue classification: the client sends category + the
    // interests/cuisines/diets arrays directly (mirroring how member prefs are
    // sent), so the backend stores them verbatim — no tag derivation.
    if (typeof category !== 'string' || category.trim() === '') {
      return res.status(400).json({ error: 'category is required and must be a non-empty string' })
    }
    for (const [field, value] of [['interests', interests], ['cuisines', cuisines], ['diets', diets]]) {
      if (value !== undefined && (!Array.isArray(value) || value.some((v) => typeof v !== 'string'))) {
        return res.status(400).json({ error: `${field} must be an array of strings` })
      }
    }
    if (
      rating !== undefined &&
      rating !== null &&
      (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 0 || rating > 5)
    ) {
      return res.status(400).json({ error: 'rating must be a number between 0 and 5, or null' })
    }
    if (
      locationImageUrl !== undefined &&
      locationImageUrl !== null &&
      (typeof locationImageUrl !== 'string' || locationImageUrl.trim() === '')
    ) {
      return res.status(400).json({ error: 'locationImageUrl must be a non-empty string or null' })
    }

    // A venue holds only place facts — the per-visit fields (order/times/travel)
    // live on the ItineraryStop, not the Pin.
    venue = {
      name: name.trim(),
      description: description ?? null,
      category: category.trim(),
      interests: interests ?? [],
      cuisines: cuisines ?? [],
      diets: diets ?? [],
      rating: rating ?? null,
      pricePerPerson,
      latitude,
      longitude,
      address: address ?? null,
      hoursOpen: null,
      locationImageUrl: locationImageUrl ? locationImageUrl.trim() : null,
    }
  } else {
    if (!Number.isInteger(pinId)) {
      return res.status(400).json({ error: 'pinId must be an integer' })
    }
    // Existing-venue path: confirm it exists before creating the stop.
    if (!(await pins.findById(pinId))) {
      return res.status(404).json({ error: 'Pin not found' })
    }
  }

  // Delegate the write to the service: it creates the stop (referencing pinId),
  // or — for a new venue — the venue + stop atomically in one transaction.
  try {
    const stop = await addStop(
      {
        ...(pinId ? { pinId } : {}),
        itineraryId,
        orderInItinerary,
        startTime: parsedStart,
        endTime: parsedEnd,
        costPerPerson: costPerPerson ?? null,
        travelTimeToNextMinutes: travelTimeToNextMinutes ?? null,
        distanceToNextMeters: distanceToNextMeters ?? null,
        mealType: mealType ?? null,
        note: note ?? null,
      },
      venue,
    )
    // Adding a stop changes the day's cost — recompute the itinerary's per-person
    // budget (see recalcBudget). Best-effort: the stop is already saved, so a
    // recalc hiccup must not fail the request.
    try {
      await recalcBudget(itineraryId)
    } catch (recalcErr) {
      console.error('Budget recalc after add stop failed:', recalcErr)
    }
    return res.status(201).json(stop)
  } catch (err) {
    // A stop already occupies this order slot (@@unique([itineraryId, orderInItinerary])).
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'That order position is already taken in this itinerary' })
    }
    throw err
  }
}

// PUT /stops/:id
// Updates an itinerary stop's visit fields (timing, travel, meal, note).
// Venue fields are NOT editable via this endpoint (they live on the Pin).
// The caller must own the itinerary.
async function updateStop(req, res) {
  const id = parseIdParam(req, res, 'stop id')
  if (id === null) return

  const stop = await itineraryStops.findByIdWithItinerary(id)

  if (!stop) {
    return res.status(404).json({ error: 'Stop not found' })
  }
  if (stop.itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit stops on your own itineraries' })
  }

  const {
    orderInItinerary,
    startTime,
    endTime,
    costPerPerson,
    travelTimeToNextMinutes,
    distanceToNextMeters,
    mealType,
    note,
  } = req.body

  const data = {}

  if (orderInItinerary !== undefined) {
    if (!Number.isInteger(orderInItinerary) || orderInItinerary < 0) {
      return res.status(400).json({ error: 'orderInItinerary must be a non-negative integer' })
    }
    data.orderInItinerary = orderInItinerary
  }
  if (startTime !== undefined) {
    const parsedStart = parseDate(startTime)
    if (!parsedStart) {
      return res.status(400).json({ error: 'startTime must be a valid date' })
    }
    data.startTime = parsedStart
  }
  if (endTime !== undefined) {
    const parsedEnd = parseDate(endTime)
    if (!parsedEnd) {
      return res.status(400).json({ error: 'endTime must be a valid date' })
    }
    data.endTime = parsedEnd
  }
  if (costPerPerson !== undefined) {
    // null clears the override (revert to the venue price); otherwise it's a
    // non-negative per-person amount just for this stop.
    if (
      costPerPerson !== null &&
      (typeof costPerPerson !== 'number' || !Number.isFinite(costPerPerson) || costPerPerson < 0)
    ) {
      return res.status(400).json({ error: 'costPerPerson must be a non-negative number or null' })
    }
    data.costPerPerson = costPerPerson
  }
  if (travelTimeToNextMinutes !== undefined) {
    if (travelTimeToNextMinutes !== null && !Number.isInteger(travelTimeToNextMinutes)) {
      return res.status(400).json({ error: 'travelTimeToNextMinutes must be an integer or null' })
    }
    data.travelTimeToNextMinutes = travelTimeToNextMinutes
  }
  if (distanceToNextMeters !== undefined) {
    if (
      distanceToNextMeters !== null &&
      (typeof distanceToNextMeters !== 'number' || !Number.isFinite(distanceToNextMeters))
    ) {
      return res.status(400).json({ error: 'distanceToNextMeters must be a number or null' })
    }
    data.distanceToNextMeters = distanceToNextMeters
  }
  if (mealType !== undefined) {
    if (mealType !== null && typeof mealType !== 'string') {
      return res.status(400).json({ error: 'mealType must be a string or null' })
    }
    data.mealType = mealType
  }
  if (note !== undefined) {
    if (note !== null && typeof note !== 'string') {
      return res.status(400).json({ error: 'note must be a string or null' })
    }
    data.note = note
  }

  // Reject a timing edit that would overlap another stop in this itinerary.
  // Only relevant when start/end is actually changing. Compare the EFFECTIVE
  // new range (submitted value, else the stop's existing value) against every
  // other stop on the same itinerary. Boundaries may touch (see rangesOverlap).
  if (data.startTime !== undefined || data.endTime !== undefined) {
    const newStart = data.startTime ?? stop.startTime
    const newEnd = data.endTime ?? stop.endTime
    const siblings = await itineraryStops.findManyByItinerary(stop.itineraryId)
    const conflict = siblings.some(
      (s) => s.id !== id && rangesOverlap(newStart, newEnd, s.startTime, s.endTime),
    )
    if (conflict) {
      return res.status(409).json({ error: 'That time overlaps another stop in this itinerary.' })
    }
  }

  try {
    const updated = await itineraryStops.update(id, data)
    // If the stop's cost changed, the itinerary's per-person budget did too.
    // Best-effort recalc: the stop edit is already committed, so don't fail the
    // request on a recalc error.
    if (data.costPerPerson !== undefined) {
      try {
        await recalcBudget(stop.itineraryId)
      } catch (recalcErr) {
        console.error('Budget recalc after edit stop failed:', recalcErr)
      }
    }
    return res.status(200).json(updated)
  } catch (err) {
    // Moving a stop onto an order slot another stop already holds.
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'That order position is already taken in this itinerary' })
    }
    throw err
  }
}

// DELETE /stops/:id
// Deletes an itinerary stop from an itinerary the caller owns.
async function deleteStop(req, res) {
  const id = parseIdParam(req, res, 'stop id')
  if (id === null) return

  const stop = await itineraryStops.findByIdWithItinerary(id)

  if (!stop) {
    return res.status(404).json({ error: 'Stop not found' })
  }
  if (stop.itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete stops on your own itineraries' })
  }

  await itineraryStops.remove(id)

  // Removing a stop lowers the day's cost — recompute the per-person budget.
  // Best-effort: the delete already committed, so don't fail the request on it.
  try {
    await recalcBudget(stop.itineraryId)
  } catch (recalcErr) {
    console.error('Budget recalc after delete stop failed:', recalcErr)
  }

  return res.status(204).send()
}

export {
  searchCatalog,
  getStop,
  createStop,
  updateStop,
  deleteStop,
}
