import * as pins from '../models/pins.js'
import * as itineraries from '../models/itineraries.js'

// Parses a value into a valid Date, or returns null if it isn't a usable date.
function parseDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// GET /pins/:id
// Returns a single pin. Readable when the parent itinerary is public or owned
// by the caller. Auth is handled by requireAuth.
async function getPin(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid pin id' })
  }

  const pin = await pins.findByIdWithItinerary(id)

  if (!pin) {
    return res.status(404).json({ error: 'Pin not found' })
  }

  if (!pin.itinerary.isPublic && pin.itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have access to this pin' })
  }

  const { itinerary, ...pinFields } = pin
  return res.status(200).json(pinFields)
}

// POST /pins
// Creates a pin on an itinerary the caller owns.
async function createPin(req, res) {
  const {
    itineraryId,
    orderInItinerary,
    name,
    description,
    tags,
    pricePerPerson,
    latitude,
    longitude,
    address,
    startTime,
    endTime,
    travelTimeToNextMinutes,
    distanceToNextMeters,
    locationImageUrl,
  } = req.body

  if (!Number.isInteger(itineraryId)) {
    return res.status(400).json({ error: 'itineraryId is required and must be an integer' })
  }
  if (!Number.isInteger(orderInItinerary) || orderInItinerary < 0) {
    return res.status(400).json({ error: 'orderInItinerary is required and must be a non-negative integer' })
  }
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name is required' })
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

  const parsedStart = parseDate(startTime)
  if (!parsedStart) {
    return res.status(400).json({ error: 'startTime is required and must be a valid date' })
  }
  const parsedEnd = parseDate(endTime)
  if (!parsedEnd) {
    return res.status(400).json({ error: 'endTime is required and must be a valid date' })
  }

  // Optional fields are validated only when provided.
  if (description !== undefined && description !== null && typeof description !== 'string') {
    return res.status(400).json({ error: 'description must be a string or null' })
  }
  if (address !== undefined && address !== null && typeof address !== 'string') {
    return res.status(400).json({ error: 'address must be a string or null' })
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string'))) {
    return res.status(400).json({ error: 'tags must be an array of strings' })
  }
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
  if (
    locationImageUrl !== undefined &&
    locationImageUrl !== null &&
    (typeof locationImageUrl !== 'string' || locationImageUrl.trim() === '')
  ) {
    return res.status(400).json({ error: 'locationImageUrl must be a non-empty string or null' })
  }

  const itinerary = await itineraries.findByIdBasic(itineraryId)
  if (!itinerary) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }
  if (itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only add pins to your own itineraries' })
  }

  const pin = await pins.create({
    itineraryId,
    orderInItinerary,
    name: name.trim(),
    description: description ?? null,
    tags: tags ?? [],
    pricePerPerson,
    latitude,
    longitude,
    address: address ?? null,
    startTime: parsedStart,
    endTime: parsedEnd,
    travelTimeToNextMinutes: travelTimeToNextMinutes ?? null,
    distanceToNextMeters: distanceToNextMeters ?? null,
    locationImageUrl: locationImageUrl ? locationImageUrl.trim() : null,
  })

  return res.status(201).json(pin)
}

// PUT /pins/:id
// Updates a pin on an itinerary the caller owns. All fields are optional.
async function updatePin(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid pin id' })
  }

  const pin = await pins.findByIdWithItinerary(id)

  if (!pin) {
    return res.status(404).json({ error: 'Pin not found' })
  }
  if (pin.itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit pins on your own itineraries' })
  }

  const {
    orderInItinerary,
    name,
    description,
    tags,
    pricePerPerson,
    latitude,
    longitude,
    address,
    startTime,
    endTime,
    travelTimeToNextMinutes,
    distanceToNextMeters,
    locationImageUrl,
  } = req.body

  const data = {}

  if (orderInItinerary !== undefined) {
    if (!Number.isInteger(orderInItinerary) || orderInItinerary < 0) {
      return res.status(400).json({ error: 'orderInItinerary must be a non-negative integer' })
    }
    data.orderInItinerary = orderInItinerary
  }
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name must be a non-empty string' })
    }
    data.name = name.trim()
  }
  if (description !== undefined) {
    if (description !== null && typeof description !== 'string') {
      return res.status(400).json({ error: 'description must be a string or null' })
    }
    data.description = description
  }
  if (tags !== undefined) {
    if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string')) {
      return res.status(400).json({ error: 'tags must be an array of strings' })
    }
    data.tags = tags
  }
  if (pricePerPerson !== undefined) {
    if (typeof pricePerPerson !== 'number' || !Number.isFinite(pricePerPerson)) {
      return res.status(400).json({ error: 'pricePerPerson must be a number' })
    }
    data.pricePerPerson = pricePerPerson
  }
  if (latitude !== undefined) {
    if (typeof latitude !== 'number' || !Number.isFinite(latitude)) {
      return res.status(400).json({ error: 'latitude must be a number' })
    }
    data.latitude = latitude
  }
  if (longitude !== undefined) {
    if (typeof longitude !== 'number' || !Number.isFinite(longitude)) {
      return res.status(400).json({ error: 'longitude must be a number' })
    }
    data.longitude = longitude
  }
  if (address !== undefined) {
    if (address !== null && typeof address !== 'string') {
      return res.status(400).json({ error: 'address must be a string or null' })
    }
    data.address = address
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
  if (locationImageUrl !== undefined) {
    if (typeof locationImageUrl !== 'string' || locationImageUrl.trim() === '') {
      return res.status(400).json({ error: 'locationImageUrl must be a non-empty string' })
    }
    data.locationImageUrl = locationImageUrl.trim()
  }

  const updated = await pins.update(id, data)

  return res.status(200).json(updated)
}

// DELETE /pins/:id
// Deletes a pin from an itinerary the caller owns.
async function deletePin(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid pin id' })
  }

  const pin = await pins.findByIdWithItinerary(id)

  if (!pin) {
    return res.status(404).json({ error: 'Pin not found' })
  }
  if (pin.itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete pins on your own itineraries' })
  }

  await pins.remove(id)

  return res.status(204).send()
}

export {
  getPin,
  createPin,
  updatePin,
  deletePin,
}
