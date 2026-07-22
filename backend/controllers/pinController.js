import * as pins from '../models/pins.js'
import * as itineraryStops from '../models/itineraryStops.js'
import * as itineraries from '../models/itineraries.js'
import { addStop } from '../services/itinerary/addStop.js'
import { parseIdParam, parseDate } from './helpers.js'

// GET /pins/:id
// Returns an itinerary stop with its venue. Readable when the parent itinerary
// is public or owned by the caller. Auth is handled by requireAuth.
async function getPin(req, res) {
  const id = parseIdParam(req, res, 'pin id')
  if (id === null) return

  const stop = await itineraryStops.findByIdWithItinerary(id)

  if (!stop) {
    return res.status(404).json({ error: 'Pin not found' })
  }

  if (!stop.itinerary.isPublic && stop.itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have access to this pin' })
  }

  const { itinerary, ...stopFields } = stop
  return res.status(200).json(stopFields)
}

// POST /pins
// Creates an itinerary stop referencing a venue pin. Accepts either an existing
// pinId (to reference a catalog venue) or inline venue fields (to create a new
// catalog venue first). The caller must own the target itinerary.
async function createPin(req, res) {
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
    if (typeof pricePerPerson !== 'number' || !Number.isFinite(pricePerPerson)) {
      return res.status(400).json({ error: 'pricePerPerson is required and must be a number' })
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
    if (rating !== undefined && rating !== null && (typeof rating !== 'number' || !Number.isFinite(rating))) {
      return res.status(400).json({ error: 'rating must be a number or null' })
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
        travelTimeToNextMinutes: travelTimeToNextMinutes ?? null,
        distanceToNextMeters: distanceToNextMeters ?? null,
        mealType: mealType ?? null,
        note: note ?? null,
      },
      venue,
    )
    return res.status(201).json(stop)
  } catch (err) {
    // A stop already occupies this order slot (@@unique([itineraryId, orderInItinerary])).
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'That order position is already taken in this itinerary' })
    }
    throw err
  }
}

// PUT /pins/:id
// Updates an itinerary stop's visit fields (timing, travel, meal, note).
// Venue fields are NOT editable via this endpoint (they live on the Pin).
// The caller must own the itinerary.
async function updatePin(req, res) {
  const id = parseIdParam(req, res, 'pin id')
  if (id === null) return

  const stop = await itineraryStops.findByIdWithItinerary(id)

  if (!stop) {
    return res.status(404).json({ error: 'Pin not found' })
  }
  if (stop.itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit pins on your own itineraries' })
  }

  const {
    orderInItinerary,
    startTime,
    endTime,
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

  try {
    const updated = await itineraryStops.update(id, data)
    return res.status(200).json(updated)
  } catch (err) {
    // Moving a stop onto an order slot another stop already holds.
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'That order position is already taken in this itinerary' })
    }
    throw err
  }
}

// DELETE /pins/:id
// Deletes an itinerary stop from an itinerary the caller owns.
async function deletePin(req, res) {
  const id = parseIdParam(req, res, 'pin id')
  if (id === null) return

  const stop = await itineraryStops.findByIdWithItinerary(id)

  if (!stop) {
    return res.status(404).json({ error: 'Pin not found' })
  }
  if (stop.itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete pins on your own itineraries' })
  }

  await itineraryStops.remove(id)

  return res.status(204).send()
}

export {
  getPin,
  createPin,
  updatePin,
  deletePin,
}
