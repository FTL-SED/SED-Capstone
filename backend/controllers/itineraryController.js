import * as itineraries from '../models/itineraries.js'
import * as itineraryStops from '../models/itineraryStops.js'
import * as likes from '../models/likes.js'
import * as bookmarks from '../models/bookmarks.js'
import * as visited from '../models/visited.js'
import { parseIdParam, parseDate, loadOrNotFound, loadOwned } from './helpers.js'
import { uploadItineraryCoverImage, removeItineraryCoverImage } from '../lib/supabase.js'
import { computeReorder } from '../services/itinerary/reorderStops.js'
import { detectImageType } from '../utils/imageType.js'

// Real image types we accept for uploads, mapped to the stored file extension
// and the Content-Type we hand Storage. Derived from the file's magic bytes
// (detectImageType), never the client-supplied mimetype.
const IMAGE_CONTENT_TYPE = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }

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

  // Validate each stop and build its ItineraryStop.create shape in one pass —
  // parse the dates once (shared parseDate) rather than validating then re-parsing.
  const stops = []
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
    const startTime = parseDate(stop.startTime)
    if (!startTime) {
      return res.status(400).json({
        error: `pins[${i}]: startTime is required and must be a valid date`,
      })
    }
    const endTime = parseDate(stop.endTime)
    if (!endTime) {
      return res.status(400).json({
        error: `pins[${i}]: endTime is required and must be a valid date`,
      })
    }
    stops.push({
      pinId: stop.pinId,
      orderInItinerary: stop.orderInItinerary,
      startTime,
      endTime,
      mealType: stop.mealType ?? null,
      note: stop.note ?? null,
      travelTimeToNextMinutes: stop.travelTimeToNextMinutes ?? null,
      distanceToNextMeters: stop.distanceToNextMeters ?? null,
    })
  }

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
      // carries at least one of the requested tags. Pin.tags was split into
      // interests/cuisines/diets, so match across all three.
      where.stops = {
        some: {
          pin: {
            OR: [
              { interests: { hasSome: tags } },
              { cuisines: { hasSome: tags } },
              { diets: { hasSome: tags } },
            ],
          },
        },
      }
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

  // Peek at ownership/privacy first (bare row, no relations) so we know whether
  // to return the owner-only view (members + meeting point) or the public one.
  const basic = await itineraries.findByIdBasic(id)
  if (!basic) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }
  const isOwner = basic.userId === req.user.id
  if (!basic.isPublic && !isOwner) {
    return res.status(403).json({ error: 'You do not have access to this itinerary' })
  }

  // Owner gets members + meeting point; a stranger viewing a public itinerary
  // does not (those are the private planning group's identities/locations).
  const itinerary = await itineraries.findById(id, { forOwner: isOwner })
  return res.status(200).json(itinerary)
}

// PUT /itineraries/:id
// Updates the caller's own itinerary. Only scalar fields are editable here; stops
// are managed through the /stops endpoints, and likes via the like/unlike routes.
async function updateItinerary(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  const itinerary = await loadOwned(res, itineraries.findByIdBasic, id, req.user.id, {
    label: 'Itinerary',
    action: 'edit',
  })
  if (!itinerary) return

  const { title, location, description, coverImageUrl, isPublic, maxBudgetPerPerson } = req.body

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
  if (maxBudgetPerPerson !== undefined) {
    if (
      maxBudgetPerPerson !== null &&
      (typeof maxBudgetPerPerson !== 'number' ||
        !Number.isFinite(maxBudgetPerPerson) ||
        maxBudgetPerPerson < 0)
    ) {
      return res.status(400).json({ error: 'maxBudgetPerPerson must be a non-negative number or null' })
    }
    data.maxBudgetPerPerson = maxBudgetPerPerson
  }

  const updated = await itineraries.update(id, data)

  return res.status(200).json(updated)
}

// PUT /itineraries/:id/stops/order
// Reorder the caller's own itinerary. Body: { stopIds: number[] } — every stop
// id of this itinerary, in the new order. Recomputes each stop's time + travel
// from the new order (re-walk only; meals are not held) and persists atomically.
async function reorderItineraryStops(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  const itinerary = await loadOwned(res, itineraries.findByIdBasic, id, req.user.id, {
    label: 'Itinerary',
    action: 'edit',
  })
  if (!itinerary) return

  const { stopIds } = req.body
  if (!Array.isArray(stopIds) || stopIds.some((s) => !Number.isInteger(s))) {
    return res.status(400).json({ error: 'stopIds must be an array of stop ids' })
  }

  const current = await itineraryStops.findManyByItineraryWithPins(id)
  const currentIds = current.map((s) => s.id)
  // stopIds must be exactly the current set — same length, no dupes, no unknowns.
  const sameSet =
    stopIds.length === currentIds.length &&
    new Set(stopIds).size === stopIds.length &&
    stopIds.every((sid) => currentIds.includes(sid))
  if (!sameSet) {
    return res.status(400).json({ error: 'stopIds must list every stop of this itinerary exactly once' })
  }

  try {
    const byId = new Map(current.map((s) => [s.id, s]))
    const ordered = stopIds.map((sid) => byId.get(sid))
    const tripDate = itinerary.tripDate
      ? itinerary.tripDate.toISOString().slice(0, 10)
      : null
    const rows = computeReorder(ordered, {
      dayStart: itinerary.dayStart,
      transport: itinerary.transport,
      tripDate,
    })
    await itineraryStops.reorderStops(id, rows)
    const updated = await itineraries.findById(id, { forOwner: true })
    return res.status(200).json(updated)
  } catch (err) {
    console.error('Reorder stops failed:', err)
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Stop order conflict, please retry' })
    }
    return res.status(500).json({ error: 'Failed to reorder stops' })
  }
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

  const itinerary = await loadOrNotFound(res, itineraries.findByIdBasic, id, 'Itinerary')
  if (!itinerary) return
  // Only public (or the owner's own) itineraries can be liked — otherwise a
  // private draft could be liked by id and then leak into the liker's dashboard.
  if (!itinerary.isPublic && itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'Only public itineraries can be liked' })
  }

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

// POST /itineraries/:id/visited
// Marks a public (or the caller's own) itinerary as visited. Idempotent — a
// repeat call just refreshes visitedAt. Same public-or-owner guard as like, so
// a private draft can't be marked by a stranger and leak into their dashboard.
async function markVisited(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  const itinerary = await loadOrNotFound(res, itineraries.findByIdBasic, id, 'Itinerary')
  if (!itinerary) return
  if (!itinerary.isPublic && itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'Only public itineraries can be marked as visited' })
  }

  await visited.upsert(req.user.id, id)

  return res.status(204).send()
}

// DELETE /itineraries/:id/visited
// Un-marks an itinerary as visited (safe to call repeatedly). No public-or-owner
// guard needed: removing your own visited row can't leak anyone else's data.
async function unmarkVisited(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  if (!(await loadOrNotFound(res, itineraries.findByIdBasic, id, 'Itinerary'))) return

  await visited.remove(req.user.id, id)

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
    // Carry the trip-level constraints so the copy is self-describing + editable.
    tripDate: source.tripDate,
    dayStart: source.dayStart,
    dayEnd: source.dayEnd,
    maxBudgetPerPerson: source.maxBudgetPerPerson,
    travelRadius: source.travelRadius,
    transport: source.transport,
    meetingPointLat: source.meetingPointLat,
    meetingPointLng: source.meetingPointLng,
    stops: {
      create: source.stops.map((s) => ({
        pinId: s.pinId,
        orderInItinerary: s.orderInItinerary,
        startTime: s.startTime,
        endTime: s.endTime,
        costPerPerson: s.costPerPerson,
        travelTimeToNextMinutes: s.travelTimeToNextMinutes,
        distanceToNextMeters: s.distanceToNextMeters,
        mealType: s.mealType,
        note: s.note,
      })),
    },
    // NOTE: members are intentionally NOT copied. They're the source group (the
    // original organizer's friends), not the forker's — and their rows carry
    // real start addresses/coords, so copying them would leak the source group's
    // data into a stranger's itinerary. A fork starts with no members.
  })

  return res.status(201).json(copy)
}

// POST /itineraries/:id/cover
// Uploads a cover image the caller owns to Supabase Storage and saves its public
// URL on the itinerary. Mirrors uploadUserAvatar. Owner-gated via loadOwned.
async function uploadItineraryCover(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  // 404 if missing, 403 if not the owner (sets the response itself).
  const owned = await loadOwned(res, itineraries.findByIdBasic, id, req.user.id, {
    label: 'Itinerary',
    action: 'modify',
  })
  if (!owned) return

  const file = req.file
  if (!file) {
    return res.status(400).json({ error: 'No image file provided' })
  }
  // Verify the actual bytes are a real image — the client-supplied mimetype is
  // spoofable, so it's never trusted for the accept decision or the stored name.
  const imageType = detectImageType(file.buffer)
  if (!imageType) {
    return res.status(400).json({ error: 'Cover must be a PNG, JPEG, or WebP image' })
  }

  try {
    // One object per itinerary, keyed by id — upsert overwrites the old cover.
    // The query string busts the CDN cache so the new image shows immediately.
    const publicUrl = await uploadItineraryCoverImage({
      path: `${id}/cover.${imageType}`,
      buffer: file.buffer,
      contentType: IMAGE_CONTENT_TYPE[imageType],
    })
    const coverImageUrl = `${publicUrl}?v=${id}-${file.size}`

    const updated = await itineraries.update(id, { coverImageUrl })
    return res.status(200).json(updated)
  } catch (err) {
    console.error('uploadItineraryCover error:', err)
    return res
      .status(500)
      .json({ error: 'Could not upload the cover image. Please try again.' })
  }
}

// DELETE /itineraries/:id/cover
// Removes the caller's cover: deletes the Storage object(s) and nulls the URL on
// the itinerary. Owner-gated via loadOwned. The DB null is the source of truth
// for whether a cover shows, so a Storage remove failure is logged but does not
// fail the request — the itinerary still ends up with no cover.
async function removeItineraryCover(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  const owned = await loadOwned(res, itineraries.findByIdBasic, id, req.user.id, {
    label: 'Itinerary',
    action: 'modify',
  })
  if (!owned) return

  try {
    await removeItineraryCoverImage(id)
  } catch (err) {
    console.error('removeItineraryCover storage error:', err)
  }

  const updated = await itineraries.update(id, { coverImageUrl: null })
  return res.status(200).json(updated)
}

export {
  createItinerary,
  listItineraries,
  getItinerary,
  updateItinerary,
  reorderItineraryStops,
  deleteItinerary,
  likeItinerary,
  unlikeItinerary,
  bookmarkItinerary,
  removeBookmark,
  markVisited,
  unmarkVisited,
  copyItinerary,
  uploadItineraryCover,
  removeItineraryCover,
}
