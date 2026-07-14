import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

// Supabase client used only to verify the caller's access token.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Reads the "Authorization: Bearer <token>" header and asks Supabase who the
// token belongs to. Returns the verified user, or null if not signed in.
async function getAuthUser(req) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null

  if (!token) return null

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data || !data.user) return null

  return { id: data.user.id, email: data.user.email }
}

// Resolves the app-side profile for the verified caller. Sends the appropriate
// error response and returns null when the caller is not usable, so handlers can
// simply `return` after a falsy result.
async function authenticateProfile(req, res) {
  const authUser = await getAuthUser(req)
  if (!authUser) {
    res.status(401).json({ error: 'You must be signed in' })
    return null
  }

  const profile = await prisma.user.findUnique({
    where: { authUserId: authUser.id },
  })
  if (!profile) {
    res.status(401).json({ error: 'You must be signed in' })
    return null
  }

  return profile
}

// Shared shape for itinerary responses: the creator summary and pins in order.
const itineraryInclude = {
  creator: { select: { id: true, username: true } },
  pins: { orderBy: { orderInItinerary: 'asc' } },
}

// POST /itineraries
// Creates an itinerary owned by the caller, with its pins created in the same
// transaction. title/location/description are AI-generated upstream and passed
// through here; constraint fields (budget, interests, etc.) are intentionally
// not persisted (see Decision Log). Pins are assumed to already be validated,
// ready-to-insert Pin objects (generation is handled by the pin route).
async function createItinerary(req, res) {
  const profile = await authenticateProfile(req, res)
  if (!profile) return

  const { title, location, description, coverImageUrl, isPublic, pins } = req.body

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title is required' })
  }
  if (!location || typeof location !== 'string' || location.trim() === '') {
    return res.status(400).json({ error: 'location is required' })
  }

  const pinData = Array.isArray(pins) ? pins : []

  // Cover image defaults to the first pin's image when not explicitly provided.
  const resolvedCover =
    coverImageUrl ?? (pinData.length > 0 ? pinData[0].locationImageUrl : null)

  const itinerary = await prisma.itinerary.create({
    data: {
      userId: profile.id,
      title: title.trim(),
      location: location.trim(),
      description: description ?? null,
      coverImageUrl: resolvedCover,
      isPublic: isPublic === true,
      ...(pinData.length > 0 ? { pins: { create: pinData } } : {}),
    },
    include: itineraryInclude,
  })

  return res.status(201).json(itinerary)
}

// GET /itineraries
// Lists itineraries the caller can see. Supports the Discover feed (public) and
// the user's own itineraries (mine), plus search/filter/sort/pagination.
async function listItineraries(req, res) {
  const profile = await authenticateProfile(req, res)
  if (!profile) return

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
      ? { userId: profile.id }
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
  // itinerary that has a pin sharing at least one of those tags.
  if (typeof interests === 'string' && interests.trim() !== '') {
    const tags = interests
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (tags.length > 0) {
      // Keep only itineraries that have at least one pin tagged with at least
      // one of the requested interests.
      where.pins = { some: { tags: { hasSome: tags } } }
    }
  }

  const orderBy =
    resolvedSort === 'popular'
      ? [{ likeCount: 'desc' }, { createdAt: 'desc' }]
      : { createdAt: 'desc' }

  const itineraries = await prisma.itinerary.findMany({
    where,
    orderBy,
    take,
    skip,
    include: itineraryInclude,
  })

  return res.status(200).json(itineraries)
}

// GET /itineraries/:id
// Returns a single itinerary. Private itineraries are only visible to their owner.
async function getItinerary(req, res) {
  const profile = await authenticateProfile(req, res)
  if (!profile) return

  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid itinerary id' })
  }

  const itinerary = await prisma.itinerary.findUnique({
    where: { id },
    include: itineraryInclude,
  })

  if (!itinerary) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }

  if (!itinerary.isPublic && itinerary.userId !== profile.id) {
    return res.status(403).json({ error: 'You do not have access to this itinerary' })
  }

  return res.status(200).json(itinerary)
}

// PUT /itineraries/:id
// Updates the caller's own itinerary. Only scalar fields are editable here; pins
// are managed through the /pins endpoints, and likeCount only via like/unlike.
async function updateItinerary(req, res) {
  const profile = await authenticateProfile(req, res)
  if (!profile) return

  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid itinerary id' })
  }

  const itinerary = await prisma.itinerary.findUnique({ where: { id } })
  if (!itinerary) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }
  if (itinerary.userId !== profile.id) {
    return res.status(403).json({ error: 'You can only edit your own itineraries' })
  }

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

  const updated = await prisma.itinerary.update({
    where: { id },
    data,
    select: { id: true, ...Object.fromEntries(Object.keys(data).map((k) => [k, true])) },
  })

  return res.status(200).json(updated)
}

// DELETE /itineraries/:id
// Deletes the caller's own itinerary. Pins, likes, and bookmarks cascade.
async function deleteItinerary(req, res) {
  const profile = await authenticateProfile(req, res)
  if (!profile) return

  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid itinerary id' })
  }

  const itinerary = await prisma.itinerary.findUnique({ where: { id } })
  if (!itinerary) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }
  if (itinerary.userId !== profile.id) {
    return res.status(403).json({ error: 'You can only delete your own itineraries' })
  }

  await prisma.itinerary.delete({ where: { id } })

  return res.status(204).send()
}

// Recomputes the denormalized likeCount from the Like rows and persists it.
async function syncLikeCount(itineraryId) {
  const likeCount = await prisma.like.count({ where: { itineraryId } })
  await prisma.itinerary.update({ where: { id: itineraryId }, data: { likeCount } })
  return likeCount
}

// POST /itineraries/:id/like
// Likes an itinerary (safe to call repeatedly) and returns the refreshed like count.
async function likeItinerary(req, res) {
  const profile = await authenticateProfile(req, res)
  if (!profile) return

  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid itinerary id' })
  }

  const itinerary = await prisma.itinerary.findUnique({ where: { id } })
  if (!itinerary) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }

  // Adds this user's like if there isn't one yet, and does nothing if there already is.
  await prisma.like.upsert({
    where: { userId_itineraryId: { userId: profile.id, itineraryId: id } },
    create: { userId: profile.id, itineraryId: id },
    update: {},
  })

  const likeCount = await syncLikeCount(id)
  return res.status(200).json({ likeCount })
}

// DELETE /itineraries/:id/like
// Unlikes an itinerary (safe to call repeatedly) and returns the refreshed like count.
async function unlikeItinerary(req, res) {
  const profile = await authenticateProfile(req, res)
  if (!profile) return

  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid itinerary id' })
  }

  const itinerary = await prisma.itinerary.findUnique({ where: { id } })
  if (!itinerary) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }

  // Removes this user's like if there is one, and does nothing if there isn't.
  await prisma.like.deleteMany({ where: { userId: profile.id, itineraryId: id } })

  const likeCount = await syncLikeCount(id)
  return res.status(200).json({ likeCount })
}

// POST /itineraries/:id/bookmark
// Bookmarks a public itinerary (safe to call repeatedly) as a read-only reference.
async function bookmarkItinerary(req, res) {
  const profile = await authenticateProfile(req, res)
  if (!profile) return

  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid itinerary id' })
  }

  const itinerary = await prisma.itinerary.findUnique({ where: { id } })
  if (!itinerary) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }
  if (!itinerary.isPublic) {
    return res.status(403).json({ error: 'Only public itineraries can be bookmarked' })
  }

  // Adds this user's bookmark if there isn't one yet, and does nothing if there already is.
  await prisma.bookmark.upsert({
    where: { userId_itineraryId: { userId: profile.id, itineraryId: id } },
    create: { userId: profile.id, itineraryId: id },
    update: {},
  })

  return res.status(204).send()
}

// DELETE /itineraries/:id/bookmark
// Removes a bookmark (safe to call repeatedly).
async function removeBookmark(req, res) {
  const profile = await authenticateProfile(req, res)
  if (!profile) return

  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid itinerary id' })
  }

  const itinerary = await prisma.itinerary.findUnique({ where: { id } })
  if (!itinerary) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }

  // Removes this user's bookmark if there is one, and does nothing if there isn't.
  await prisma.bookmark.deleteMany({ where: { userId: profile.id, itineraryId: id } })

  return res.status(204).send()
}

// POST /itineraries/:id/copy
// Deep-duplicates a public (or owned) itinerary and its pins into a new editable
// itinerary owned by the caller, linked back via sourceItineraryId.
async function copyItinerary(req, res) {
  const profile = await authenticateProfile(req, res)
  if (!profile) return

  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid itinerary id' })
  }

  const source = await prisma.itinerary.findUnique({
    where: { id },
    include: { pins: { orderBy: { orderInItinerary: 'asc' } } },
  })

  if (!source) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }
  if (!source.isPublic && source.userId !== profile.id) {
    return res.status(403).json({ error: 'You do not have access to this itinerary' })
  }

  const copy = await prisma.itinerary.create({
    data: {
      userId: profile.id,
      sourceItineraryId: source.id,
      title: source.title,
      location: source.location,
      description: source.description,
      coverImageUrl: source.coverImageUrl,
      isPublic: false,
      likeCount: 0,
      pins: {
        create: source.pins.map((pin) => ({
          orderInItinerary: pin.orderInItinerary,
          name: pin.name,
          description: pin.description,
          tags: pin.tags,
          pricePerPerson: pin.pricePerPerson,
          latitude: pin.latitude,
          longitude: pin.longitude,
          address: pin.address,
          startTime: pin.startTime,
          endTime: pin.endTime,
          travelTimeToNextMinutes: pin.travelTimeToNextMinutes,
          distanceToNextMeters: pin.distanceToNextMeters,
          locationImageUrl: pin.locationImageUrl,
        })),
      },
    },
    include: itineraryInclude,
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