// One-off, idempotent: for each itinerary-attached Pin (itineraryId != null),
// create the equivalent ItineraryStop row. The stop points at the SAME Pin
// (pinId) — we do NOT dedupe venues here; the Pin row remains both the venue
// and (until Phase 5) the legacy stop. Per-visit fields (order, times, travel)
// copy across; a meal word baked into tags (breakfast/lunch/dinner) becomes the
// stop's mealType. Idempotent: we skip any (itineraryId, orderInItinerary) that
// already has a stop, so re-running inserts nothing.
import prisma from '../lib/prisma.js'
import { MEAL_TAGS } from '../services/recommendation/pinsRepository/classify.js'

const MEAL_SET = new Set(MEAL_TAGS)

async function main() {
  const attached = await prisma.pin.findMany({ where: { NOT: { itineraryId: null } } })

  const existing = await prisma.itineraryStop.findMany({
    select: { itineraryId: true, orderInItinerary: true },
  })
  const seen = new Set(existing.map((s) => `${s.itineraryId}|${s.orderInItinerary}`))

  const toCreate = []
  for (const pin of attached) {
    const key = `${pin.itineraryId}|${pin.orderInItinerary}`
    if (seen.has(key)) continue
    const mealType = (pin.tags ?? []).find((t) => MEAL_SET.has(t)) ?? null
    toCreate.push({
      pinId: pin.id,
      itineraryId: pin.itineraryId,
      orderInItinerary: pin.orderInItinerary,
      startTime: pin.startTime,
      endTime: pin.endTime,
      travelTimeToNextMinutes: pin.travelTimeToNextMinutes,
      distanceToNextMeters: pin.distanceToNextMeters,
      mealType,
      note: null,
    })
  }

  if (toCreate.length === 0) {
    console.log(`No new stops to create (${existing.length} already present).`)
    return
  }
  const result = await prisma.itineraryStop.createMany({ data: toCreate })
  console.log(`Created ${result.count} ItineraryStop rows (${existing.length} already present).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
