// backend/scripts/enrich/dedupeNearby.mjs
// Collapse same-name venues within 100m (the same physical place) to one row.
// Keeps the richest pin (see dedupHelpers.pickSurvivor), re-points any
// ItineraryStop from a loser onto the survivor (ItineraryStop.pinId is RESTRICT,
// so this must happen before delete), then deletes the losers.
//
// Usage (from backend/):
//   node scripts/enrich/dedupeNearby.mjs           # DRY RUN, prints the plan
//   node scripts/enrich/dedupeNearby.mjs --apply   # execute
import 'dotenv/config'
import prisma from '../../lib/prisma.js'
import { clusterByProximity, pickSurvivor } from './dedupHelpers.js'

const THRESHOLD_M = 100
const APPLY = process.argv.slice(2).includes('--apply')

async function main() {
  const pins = await prisma.pin.findMany({
    select: { id: true, name: true, latitude: true, longitude: true, source: true, description: true, rating: true },
  })
  const refRows = await prisma.$queryRawUnsafe(`SELECT DISTINCT "pinId" AS id FROM "ItineraryStop"`)
  const referencedIds = new Set(refRows.map((r) => r.id))

  const clusters = clusterByProximity(pins, THRESHOLD_M)
  const plan = clusters.map((c) => pickSurvivor(c, referencedIds))

  const loserTotal = plan.reduce((n, p) => n + p.losers.length, 0)
  console.log(`Clusters (same name, <=${THRESHOLD_M}m): ${clusters.length}  |  pins to remove: ${loserTotal}  |  mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`)
  for (const { survivor, losers } of plan) {
    console.log(`• ${survivor.name}: keep #${survivor.id} (${survivor.source}), remove ${losers.map((l) => `#${l.id}(${l.source})`).join(', ')}`)
  }

  // Safety: no survivor may itself be a loser of another cluster (disjoint by
  // construction — clusters partition a name group — but assert anyway).
  const survivorIds = new Set(plan.map((p) => p.survivor.id))
  const loserIds = plan.flatMap((p) => p.losers.map((l) => l.id))
  const conflict = loserIds.filter((id) => survivorIds.has(id))
  if (conflict.length) throw new Error(`survivor/loser conflict: ${conflict.join(',')}`)

  if (!APPLY) {
    console.log('\n[DRY RUN] Nothing changed. Re-run with --apply to execute.')
    await prisma.$disconnect()
    return
  }

  let removed = 0
  for (const { survivor, losers } of plan) {
    await prisma.$transaction([
      ...losers.map((l) =>
        prisma.itineraryStop.updateMany({ where: { pinId: l.id }, data: { pinId: survivor.id } })),
      ...losers.map((l) => prisma.pin.delete({ where: { id: l.id } })),
    ])
    removed += losers.length
  }

  // Verify: every stop still resolves to an existing pin.
  const dangling = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "ItineraryStop" s LEFT JOIN "Pin" p ON p.id = s."pinId" WHERE p.id IS NULL`)
  const remaining = await prisma.pin.count()
  console.log(`\n[APPLIED] removed ${removed} pins. Catalog: ${remaining}. Dangling stops (must be 0): ${dangling[0].n}`)
  await prisma.$disconnect()
}

main().catch((err) => { console.error('dedupe failed:', err); process.exit(1) })
