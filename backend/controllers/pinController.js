import * as pins from '../models/pins.js'
import * as itineraryStops from '../models/itineraryStops.js'
import * as itineraries from '../models/itineraries.js'

// Parses a value into a valid Date, or returns null if it isn't a usable date.
function parseDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// GET /pins/:id
// Returns an itinerary stop with its venue. Readable when the parent itinerary
// is public or owned by the caller. Auth is handled by requireAuth.
async function getPin(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid pin id' })
  }

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
    tags,
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

  let venuePinId = pinId

  // If no pinId provided, create a new catalog venue pin from inline fields
  if (!venuePinId) {
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
    if (tags !== undefined && (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string'))) {
      return res.status(400).json({ error: 'tags must be an array of strings' })
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

    // Create catalog venue pin (itineraryId = null)
    const venue = await pins.create({
      itineraryId: null,
      orderInItinerary: 0,
      name: name.trim(),
      description: description ?? null,
      tags: tags ?? [],
      rating: rating ?? null,
      pricePerPerson,
      latitude,
      longitude,
      address: address ?? null,
      startTime: parsedStart,
      endTime: parsedEnd,
      travelTimeToNextMinutes: null,
      distanceToNextMeters: null,
      locationImageUrl: locationImageUrl ? locationImageUrl.trim() : null,
    })
    venuePinId = venue.id
  } else {
    // Validate pinId when provided
    if (!Number.isInteger(venuePinId)) {
      return res.status(400).json({ error: 'pinId must be an integer' })
    }
  }

  // Create the itinerary stop referencing the venue
  const stop = await itineraryStops.create({
    pinId: venuePinId,
    itineraryId,
    orderInItinerary,
    startTime: parsedStart,
    endTime: parsedEnd,
    travelTimeToNextMinutes: travelTimeToNextMinutes ?? null,
    distanceToNextMeters: distanceToNextMeters ?? null,
    mealType: mealType ?? null,
    note: note ?? null,
  })

  return res.status(201).json(stop)
}

// PUT /pins/:id
// Updates an itinerary stop's visit fields (timing, travel, meal, note).
// Venue fields are NOT editable via this endpoint (they live on the Pin).
// The caller must own the itinerary.
async function updatePin(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid pin id' })
  }

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

  const updated = await itineraryStops.update(id, data)

  return res.status(200).json(updated)
}

// DELETE /pins/:id
// Deletes an itinerary stop from an itinerary the caller owns.
async function deletePin(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid pin id' })
  }

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
