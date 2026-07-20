// One-off, idempotent: give every Pin a neutral all-week open window so the
// engine can read real hours once it switches off the startTime/endTime proxy.
// Real per-day hours can be refined later.
import prisma from '../lib/prisma.js'

const NEUTRAL = {
  mon: '08:00-22:00', tue: '08:00-22:00', wed: '08:00-22:00',
  thu: '08:00-22:00', fri: '08:00-22:00', sat: '08:00-22:00', sun: '08:00-22:00',
}

async function main() {
  // Prisma's JSON filter doesn't support { equals: null } syntax for database NULLs.
  // Use raw SQL with IS NULL to update all pins with null hoursOpen.
  const result = await prisma.$executeRaw`
    UPDATE "Pin" SET "hoursOpen" = ${NEUTRAL}::jsonb
    WHERE "hoursOpen" IS NULL
  `
  console.log(`Set hoursOpen on ${result} pins.`)
}

main().then(() => process.exit(0))
