// Data-access wrapper for the Itinerary table. Thin — no business logic, no
// req/res (see .claude/rules/backend.md → Models).
import prisma from '../lib/prisma.js'

// Full shape for DETAIL responses (findById/create): creator summary, stops
// (with their venue pins) in order, and a live count of likes (the Like rows are
// the single source of truth — there is no stored likeCount column). `members`
// is included ONLY for the owner (see findById's forOwner flag) — they're the
// private planning group (names + home addresses), never returned to strangers.
function detailInclude(forOwner) {
  return {
    creator: { select: { id: true, username: true } },
    stops: { orderBy: { orderInItinerary: 'asc' }, include: { pin: true } },
    _count: { select: { likes: true } },
    ...(forOwner ? { members: true } : {}),
  }
}

// Lighter shape for LIST/FEED responses (findMany): the Discover feed and card
// grids only render title/location/cover/creator/likeCount, never the stops or
// pins — so we skip the stops+pin joins entirely. reshapeItinerary defaults a
// missing `stops` to `pins: []`, so the response shape stays consistent.
const itinerarySummaryInclude = {
  creator: { select: { id: true, username: true } },
  _count: { select: { likes: true } },
}

// Owner-only fields on an Itinerary: the private planning group and the
// geographic points derived from members' homes. Stripped for non-owners so a
// public itinerary never leaks the group's identities/locations to strangers.
// Explicit allow-listing here (rather than relying on the `...rest` spread)
// keeps new sensitive columns from silently leaking as the schema grows.
const OWNER_ONLY_FIELDS = ['members', 'meetingPointLat', 'meetingPointLng']

// Reshape Prisma's `{ _count: { likes }, stops: [{ stop, pin }] }` into the
// flat legacy shape: `likeCount` and `pins[]` (flattened stop+pin combos).
// Reconstructs `tags` from pin's interests/cuisines/diets + mealType so the
// frontend meal badge and tag display keep working. When `forOwner` is false,
// owner-only fields are removed from the response.
function reshapeItinerary(itinerary, { forOwner = true } = {}) {
  if (!itinerary) return itinerary
  const { _count, stops, ...rest } = itinerary
  const pins = (stops ?? []).map((s) => {
    const p = s.pin
    const tags = [...(p.interests ?? []), ...(p.cuisines ?? []), ...(p.diets ?? [])]
    if (s.mealType) tags.push(s.mealType)
    return {
      id: p.id,
      // The ItineraryStop id (distinct from the venue Pin id above). The
      // /pins/:id edit + delete endpoints operate on this, so the frontend
      // needs it to remove or edit an individual stop. pinId is the venue id,
      // used when referencing the same catalog venue elsewhere.
      stopId: s.id,
      pinId: p.id,
      name: p.name,
      description: s.note ?? p.description ?? null,
      tags,
      rating: p.rating,
      pricePerPerson: p.pricePerPerson,
      latitude: p.latitude,
      longitude: p.longitude,
      address: p.address,
      locationImageUrl: p.locationImageUrl,
      orderInItinerary: s.orderInItinerary,
      startTime: s.startTime,
      endTime: s.endTime,
      travelTimeToNextMinutes: s.travelTimeToNextMinutes,
      distanceToNextMeters: s.distanceToNextMeters,
      mealType: s.mealType ?? null,
    }
  })
  const shaped = { ...rest, likeCount: _count?.likes ?? 0, pins }
  if (!forOwner) for (const f of OWNER_ONLY_FIELDS) delete shaped[f]
  return shaped
}

async function create(data) {
  // The creator is always the owner, so return the full owner shape.
  const itinerary = await prisma.itinerary.create({ data, include: detailInclude(true) })
  return reshapeItinerary(itinerary, { forOwner: true })
}

async function findMany({ where, orderBy, take, skip }) {
  const rows = await prisma.itinerary.findMany({
    where,
    orderBy,
    take,
    skip,
    include: itinerarySummaryInclude,
  })
  // List/feed rows are shown to anyone; strip owner-only fields.
  return rows.map((r) => reshapeItinerary(r, { forOwner: false }))
}

// Full record with creator + ordered pins, for detail views. Pass forOwner=true
// ONLY when the caller owns the itinerary — it gates whether members and the
// home-derived meeting point are included/returned.
async function findById(id, { forOwner = false } = {}) {
  const itinerary = await prisma.itinerary.findUnique({ where: { id }, include: detailInclude(forOwner) })
  return reshapeItinerary(itinerary, { forOwner })
}

// Bare record, for ownership/existence checks that don't need relations.
function findByIdBasic(id) {
  return prisma.itinerary.findUnique({ where: { id } })
}

// Record plus its stops in order, for deep-copying. Members are deliberately
// NOT included — a fork doesn't copy the source group (see copyItinerary).
function findByIdWithStops(id) {
  return prisma.itinerary.findUnique({
    where: { id },
    include: { stops: { orderBy: { orderInItinerary: 'asc' } } },
  })
}

// The caller passes only the fields being changed; the returned `select`
// mirrors those keys (plus id) so the response echoes exactly what changed.
function update(id, data) {
  return prisma.itinerary.update({
    where: { id },
    data,
    select: { id: true, ...Object.fromEntries(Object.keys(data).map((k) => [k, true])) },
  })
}

function remove(id) {
  return prisma.itinerary.delete({ where: { id } })
}

export {
  reshapeItinerary,
  create,
  findMany,
  findById,
  findByIdBasic,
  findByIdWithStops,
  update,
  remove,
}
