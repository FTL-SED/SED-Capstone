// One-off, idempotent: deletes legacy attached-pin rows (Pin where itineraryId != null)
// that are now unreferenced after Task 5.3 repointed all ItineraryStops to catalog venues.
// Catalog pins (itineraryId = null) are retained.
//
// SAFETY: Pre-checks that 0 stops reference attached pins before deleting anything.
// If any stops still reference attached pins, aborts without deleting.
import prisma from '../lib/prisma.js'

async function main() {
  // SAFETY PRE-CHECK: verify 0 stops reference attached pins
  const stops = await prisma.itineraryStop.findMany({
    include: { pin: { select: { itineraryId: true } } },
  })

  const stillReferenced = stops.filter((s) => s.pin.itineraryId !== null).length

  if (stillReferenced > 0) {
    console.error(
      `❌ ABORT: ${stillReferenced} ItineraryStop(s) still reference attached pins (itineraryId != null).`,
    )
    console.error('Run repointStopsToVenues.js first to repoint all stops to catalog venues.')
    process.exit(1)
  }

  console.log('✓ Safety check passed: 0 stops reference attached pins.')

  // Count before deletion
  const attachedCount = await prisma.pin.count({
    where: { NOT: { itineraryId: null } },
  })

  const catalogCount = await prisma.pin.count({
    where: { itineraryId: null },
  })

  // Delete all attached pins
  const result = await prisma.pin.deleteMany({
    where: { NOT: { itineraryId: null } },
  })

  console.log(
    `Deleted ${result.count} legacy attached pins (${catalogCount} catalog pins retained).`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
