// One-off, idempotent: derive the explicit category/interests/cuisines/diets
// columns from each Pin's existing `tags` (via the same classifier the engine
// uses at read-time) and persist them. Leaves `tags` in place — Phase 5 drops
// it later. Re-running produces identical values, so it's safe to repeat.
import prisma from '../lib/prisma.js'
import { classifyTags } from '../services/recommendation/pinsRepository/classify.js'

async function main() {
  const pins = await prisma.pin.findMany({ select: { id: true, tags: true } })
  let updated = 0
  for (const pin of pins) {
    const { category, interests, cuisines, diets } = classifyTags(pin.tags)
    await prisma.pin.update({
      where: { id: pin.id },
      data: { category, interests, cuisines, diets },
    })
    updated++
  }
  console.log(`Backfilled explicit tag fields on ${updated} pins.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
