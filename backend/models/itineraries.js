// Data-access wrapper for the Itinerary table. Thin — no business logic, no
// req/res (see .claude/rules/backend.md → Models).
import prisma from '../lib/prisma.js'

// Shared shape for itinerary responses: the creator summary, stops (with their
// venue pins) in order, and a live count of likes (the Like rows are the single
// source of truth — there is no stored likeCount column).
const itineraryInclude = {
  creator: { select: { id: true, username: true } },
  stops: { orderBy: { orderInItinerary: 'asc' }, include: { pin: true } },
  _count: { select: { likes: true } },
}

// Reshape Prisma's `{ _count: { likes }, stops: [{ stop, pin }] }` into the
// flat legacy shape: `likeCount` and `pins[]` (flattened stop+pin combos).
// Reconstructs `tags` from pin's interests/cuisines/diets + mealType so the
// frontend meal badge and tag display keep working.
function reshapeItinerary(itinerary) {
  if (!itinerary) return itinerary
  const { _count, stops, ...rest } = itinerary
  const pins = (stops ?? []).map((s) => {
    const p = s.pin
    const tags = [...(p.interests ?? []), ...(p.cuisines ?? []), ...(p.diets ?? [])]
    if (s.mealType) tags.push(s.mealType)
    return {
      id: p.id,
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
  return { ...rest, likeCount: _count?.likes ?? 0, pins }
}

async function create(data) {
  const itinerary = await prisma.itinerary.create({ data, include: itineraryInclude })
  return reshapeItinerary(itinerary)
}

async function findMany({ where, orderBy, take, skip }) {
  const rows = await prisma.itinerary.findMany({
    where,
    orderBy,
    take,
    skip,
    include: itineraryInclude,
  })
  return rows.map(reshapeItinerary)
}

// Full record with creator + ordered pins, for detail views.
async function findById(id) {
  const itinerary = await prisma.itinerary.findUnique({ where: { id }, include: itineraryInclude })
  return reshapeItinerary(itinerary)
}

// Bare record, for ownership/existence checks that don't need relations.
function findByIdBasic(id) {
  return prisma.itinerary.findUnique({ where: { id } })
}

// Record plus its stops in order, for deep-copying.
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
  itineraryInclude,
  reshapeItinerary,
  create,
  findMany,
  findById,
  findByIdBasic,
  findByIdWithStops,
  update,
  remove,
}
