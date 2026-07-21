import * as itineraries from '../models/itineraries.js'
import * as likes from '../models/likes.js'
import * as bookmarks from '../models/bookmarks.js'
import { parseIdParam, loadOrNotFound, loadOwned } from './helpers.js'

// POST /itineraries
// Creates an itinerary owned by the caller, with its stops referencing venue pins.
// title/location/description are AI-generated upstream and passed through here;
// constraint fields (budget, interests, etc.) are intentionally not persisted
// (see Decision Log). Each stop must reference an existing catalog venue via pinId.
// Auth is handled by requireAuth.
async function createItinerary(req, res) {
  const { title, location, description, coverImageUrl, isPublic, pins } = req.body

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title is required' })
  }
  if (!location || typeof location !== 'string' || location.trim() === '') {
    return res.status(400).json({ error: 'location is required' })
  }

  const pinData = Array.isArray(pins) ? pins : []

  // Validate that all stops carry pinId + required visit fields
  for (let i = 0; i < pinData.length; i++) {
    const stop = pinData[i]
    if (!Number.isInteger(stop.pinId)) {
      return res.status(400).json({
        error: `pins[${i}]: pinId is required and must reference an existing venue pin`,
      })
    }
    if (!Number.isInteger(stop.orderInItinerary) || stop.orderInItinerary < 0) {
      return res.status(400).json({
        error: `pins[${i}]: orderInItinerary is required and must be a non-negative integer`,
      })
    }
    const parsedStart = stop.startTime ? new Date(stop.startTime) : null
    if (!parsedStart || Number.isNaN(parsedStart.getTime())) {
      return res.status(400).json({
        error: `pins[${i}]: startTime is required and must be a valid date`,
      })
    }
    const parsedEnd = stop.endTime ? new Date(stop.endTime) : null
    if (!parsedEnd || Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({
        error: `pins[${i}]: endTime is required and must be a valid date`,
      })
    }
  }

  // Map to ItineraryStop.create shape
  const stops = pinData.map((stop) => ({
    pinId: stop.pinId,
    orderInItinerary: stop.orderInItinerary,
    startTime: new Date(stop.startTime),
    endTime: new Date(stop.endTime),
    mealType: stop.mealType ?? null,
    note: stop.note ?? null,
    travelTimeToNextMinutes: stop.travelTimeToNextMinutes ?? null,
    distanceToNextMeters: stop.distanceToNextMeters ?? null,
  }))

  const itinerary = await itineraries.create({
    userId: req.user.id,
    title: title.trim(),
    location: location.trim(),
    description: description ?? null,
    coverImageUrl: coverImageUrl ?? null,
    isPublic: isPublic === true,
    ...(stops.length > 0 ? { stops: { create: stops } } : {}),
  })

  return res.status(201).json(itinerary)
}

// GET /itineraries
// Lists itineraries the caller can see. Supports the Discover feed (public) and
// the user's own itineraries (mine), plus search/filter/sort/pagination.
async function listItineraries(req, res) {
  const { q, location, interests, scope, sort, limit, offset } = req.query

  const resolvedScope = scope ?? 'public'
  if (resolvedScope !== 'public' && resolvedScope !== 'mine') {
    return res.status(400).json({ error: 'scope must be "public" or "mine"' })
  }

  const resolvedSort = sort ?? 'recent'
  if (resolvedSort !== 'recent' && resolvedSort !== 'popular') {
    return res.status(400).json({ error: 'sort must be "recent" or "popular"' })
  }

  // Pagination: `take` is the page size (how many rows to return) and `skip` is
  // the offset (how many rows to jump over first). Page N of size 10 is
  // skip = (N-1) * 10, take = 10 — this backs the Discover <LoadMoreButton>.
  const take = limit === undefined ? 20 : Number(limit)
  const skip = offset === undefined ? 0 : Number(offset)
  if (!Number.isInteger(take) || take < 0 || !Number.isInteger(skip) || skip < 0) {
    return res.status(400).json({ error: 'limit and offset must be non-negative integers' })
  }

  const where =
    resolvedScope === 'mine'
      ? { userId: req.user.id }
      : { isPublic: true }

  // Free-text search (?q=): match itineraries whose title OR location contains
  // the query as a case-insensitive substring (e.g. "fran" matches "San
  // Francisco"). Only applied when the user actually typed something.
  if (typeof q === 'string' && q.trim() !== '') {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (typeof location === 'string' && location.trim() !== '') {
    where.location = { contains: location, mode: 'insensitive' }
  }

  // Interest filter (?interests=): parse the comma-separated string into a clean
  // tag array — split on commas, trim whitespace, and drop empties so a stray
  // comma (e.g. "food,,museums") can't add a bogus "" tag. Then match any
  // itinerary that has a stop whose venue is tagged with at least one of those interests.
  if (typeof interests === 'string' && interests.trim() !== '') {
    const tags = interests
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (tags.length > 0) {
      // Keep only itineraries that have at least one stop whose venue pin
      // carries at least one of the requested interest tags.
      where.stops = { some: { pin: { tags: { hasSome: tags } } } }
    }
  }

  const orderBy =
    resolvedSort === 'popular'
      ? [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }]
      : { createdAt: 'desc' }

  const result = await itineraries.findMany({ where, orderBy, take, skip })

  return res.status(200).json(result)
}

// GET /itineraries/:id
// Returns a single itinerary. Private itineraries are only visible to their owner.
async function getItinerary(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  const itinerary = await itineraries.findById(id)

  if (!itinerary) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }

  if (!itinerary.isPublic && itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have access to this itinerary' })
  }

  return res.status(200).json(itinerary)
}

// PUT /itineraries/:id
// Updates the caller's own itinerary. Only scalar fields are editable here; pins
// are managed through the /pins endpoints, and likes via the like/unlike routes.
async function updateItinerary(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  const itinerary = await loadOwned(res, itineraries.findByIdBasic, id, req.user.id, {
    label: 'Itinerary',
    action: 'edit',
  })
  if (!itinerary) return

  const { title, location, description, coverImageUrl, isPublic } = req.body

  const data = {}
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'title must be a non-empty string' })
    }
    data.title = title.trim()
  }
  if (location !== undefined) {
    if (typeof location !== 'string' || location.trim() === '') {
      return res.status(400).json({ error: 'location must be a non-empty string' })
    }
    data.location = location.trim()
  }
  if (description !== undefined) {
    if (description !== null && typeof description !== 'string') {
      return res.status(400).json({ error: 'description must be a string or null' })
    }
    data.description = description
  }
  if (coverImageUrl !== undefined) {
    if (coverImageUrl !== null && typeof coverImageUrl !== 'string') {
      return res.status(400).json({ error: 'coverImageUrl must be a string or null' })
    }
    data.coverImageUrl = coverImageUrl
  }
  if (isPublic !== undefined) {
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ error: 'isPublic must be a boolean' })
    }
    data.isPublic = isPublic
  }

  const updated = await itineraries.update(id, data)

  return res.status(200).json(updated)
}

// DELETE /itineraries/:id
// Deletes the caller's own itinerary. Pins, likes, and bookmarks cascade.
async function deleteItinerary(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  const itinerary = await loadOwned(res, itineraries.findByIdBasic, id, req.user.id, {
    label: 'Itinerary',
    action: 'delete',
  })
  if (!itinerary) return

  await itineraries.remove(id)

  return res.status(204).send()
}

// POST /itineraries/:id/like
// Likes an itinerary (safe to call repeatedly) and returns the current like count.
async function likeItinerary(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  if (!(await loadOrNotFound(res, itineraries.findByIdBasic, id, 'Itinerary'))) return

  await likes.upsert(req.user.id, id)

  const likeCount = await likes.countForItinerary(id)
  return res.status(200).json({ likeCount })
}

// DELETE /itineraries/:id/like
// Unlikes an itinerary (safe to call repeatedly) and returns the current like count.
async function unlikeItinerary(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  if (!(await loadOrNotFound(res, itineraries.findByIdBasic, id, 'Itinerary'))) return

  await likes.remove(req.user.id, id)

  const likeCount = await likes.countForItinerary(id)
  return res.status(200).json({ likeCount })
}

// POST /itineraries/:id/bookmark
// Bookmarks a public itinerary (safe to call repeatedly) as a read-only reference.
async function bookmarkItinerary(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  const itinerary = await loadOrNotFound(res, itineraries.findByIdBasic, id, 'Itinerary')
  if (!itinerary) return
  if (!itinerary.isPublic) {
    return res.status(403).json({ error: 'Only public itineraries can be bookmarked' })
  }

  await bookmarks.upsert(req.user.id, id)

  return res.status(204).send()
}

// DELETE /itineraries/:id/bookmark
// Removes a bookmark (safe to call repeatedly).
async function removeBookmark(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  if (!(await loadOrNotFound(res, itineraries.findByIdBasic, id, 'Itinerary'))) return

  await bookmarks.remove(req.user.id, id)

  return res.status(204).send()
}

// POST /itineraries/:id/copy
// Deep-duplicates a public (or owned) itinerary and its pins into a new editable
// itinerary owned by the caller, linked back via sourceItineraryId.
async function copyItinerary(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  const source = await itineraries.findByIdWithStops(id)

  if (!source) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }
  if (!source.isPublic && source.userId !== req.user.id) {
    return res.status(403).json({ error: 'You do not have access to this itinerary' })
  }

  const copy = await itineraries.create({
    userId: req.user.id,
    sourceItineraryId: source.id,
    title: source.title,
    location: source.location,
    description: source.description,
    coverImageUrl: source.coverImageUrl,
    isPublic: false,
    stops: {
      create: source.stops.map((s) => ({
        pinId: s.pinId,
        orderInItinerary: s.orderInItinerary,
        startTime: s.startTime,
        endTime: s.endTime,
        travelTimeToNextMinutes: s.travelTimeToNextMinutes,
        distanceToNextMeters: s.distanceToNextMeters,
        mealType: s.mealType,
        note: s.note,
      })),
    },
  })

  return res.status(201).json(copy)
}

export {
  createItinerary,
  listItineraries,
  getItinerary,
  updateItinerary,
  deleteItinerary,
  likeItinerary,
  unlikeItinerary,
  bookmarkItinerary,
  removeBookmark,
  copyItinerary,
}
