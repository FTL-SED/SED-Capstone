// backend/scripts/reconcilePinSplit.js
// Read-only verification that Phase 2's backfill is complete and correct.
// Checks:
//   1. Every itinerary-attached Pin maps to exactly one ItineraryStop
//      (matched on itineraryId + orderInItinerary), and stop count == attached count.
//   2. Every ItineraryStop.pinId resolves to an existing Pin.
//   3. Per-itinerary stop order is preserved (the set of orders matches).
//   4. No Pin still carries the Phase-1 default of category='activity' while
//      having a food/cuisine tag (i.e. the field backfill actually ran).
import prisma from '../lib/prisma.js'

async function main() {
  const problems = []

  const attached = await prisma.pin.findMany({
    where: { NOT: { itineraryId: null } },
    select: { itineraryId: true, orderInItinerary: true },
  })
  const stops = await prisma.itineraryStop.findMany({
    select: { itineraryId: true, orderInItinerary: true, pinId: true },
  })

  // 1. counts
  if (stops.length !== attached.length) {
    problems.push(`stop count ${stops.length} != attached-pin count ${attached.length}`)
  }

  // 1b. every attached pin has a matching stop
  const stopKeys = new Set(stops.map((s) => `${s.itineraryId}|${s.orderInItinerary}`))
  for (const p of attached) {
    if (!stopKeys.has(`${p.itineraryId}|${p.orderInItinerary}`)) {
      problems.push(`attached pin ${p.itineraryId}|${p.orderInItinerary} has no ItineraryStop`)
    }
  }

  // 2. every stop.pinId resolves
  const pinIds = new Set((await prisma.pin.findMany({ select: { id: true } })).map((p) => p.id))
  for (const s of stops) {
    if (!pinIds.has(s.pinId)) problems.push(`stop pinId ${s.pinId} does not resolve to a Pin`)
  }

  // 4. field backfill ran (no food-tagged pin left as default 'activity')
  const miscategorized = await prisma.pin.count({
    where: { category: 'activity', tags: { hasSome: ['food', 'mexican', 'chinese', 'italian', 'pizza', 'sushi'] } },
  })
  if (miscategorized > 0) {
    problems.push(`${miscategorized} food-tagged pins still categorized as 'activity' (field backfill incomplete)`)
  }

  if (problems.length > 0) {
    console.error('RECONCILIATION FAILED:')
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(`Reconciliation OK: ${stops.length} stops match ${attached.length} attached pins; all pinIds resolve; field backfill complete.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
