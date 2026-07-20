import 'dotenv/config'

import { PrismaClient } from '@prisma/client'

import sfPlaces from '../prisma/data/sfPlaces/index.js'

// Loads the hand-curated San Francisco place catalog (prisma/data/sfPlaces/)
// into the Pin table as standalone catalog pins (itineraryId: null). These
// pins belong to no itinerary; they exist purely as the seeded place data the
// recommendation engine reads (pinsRepository.getAllPins unions them with
// public-itinerary pins). See .claude/docs/data-strategy.md.
//
// Additive + idempotent: dedupes against pins already in the DB by
// name + rounded coordinates, so re-running only inserts genuinely new places
// and never touches the demo data seeded by prisma/seed.js.
//
// Run with: npm run seed:places

// Self-contained client (matches prisma/seed.js) — avoids lib/prisma.js's
// driver adapter and works with the connection string directly.
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })

// Catalog pins carry no real business hours. Give them a neutral all-day SF
// window so the engine's isOpenInWindow stays permissive (openingHours is a
// weak proxy for these — see pinsRepository.js). -07:00 matches seed.js.
const CATALOG_DAY = '2026-08-15'
const OPEN_TIME = '08:00'
const CLOSE_TIME = '22:00'

// OSM/dataset coords carry ~4 decimals; round to the same precision so the
// dedupe key is stable across the DB round-trip.
function coordKey(name, latitude, longitude) {
  return `${name}|${latitude.toFixed(4)}|${longitude.toFixed(4)}`
}

// A dataset place -> a full Pin row. Catalog places have no real photo, so
// locationImageUrl is left null; the UI falls back to a placeholder image.
function toPin(place) {
  return {
    // A catalog place belongs to no itinerary. orderInItinerary is meaningless
    // for it, so we use the sentinel 0 (see the Pin model comment in schema.prisma).
    itineraryId: null,
    orderInItinerary: 0,
    name: place.name,
    description: place.description,
    tags: place.tags,
    rating: place.rating,
    pricePerPerson: place.pricePerPerson,
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.address,
    startTime: new Date(`${CATALOG_DAY}T${OPEN_TIME}:00-07:00`),
    endTime: new Date(`${CATALOG_DAY}T${CLOSE_TIME}:00-07:00`),
    travelTimeToNextMinutes: null,
    distanceToNextMeters: null,
    locationImageUrl: null,
  }
}

async function main() {
  console.log(`Loaded ${sfPlaces.length} curated SF places.`)

  // Existing pins (all of them) form the dedupe set — a curated place already
  // present as someone's itinerary pin shouldn't be re-added as a catalog pin.
  const existing = await prisma.pin.findMany({
    select: { name: true, latitude: true, longitude: true },
  })
  const seen = new Set(existing.map((p) => coordKey(p.name, p.latitude, p.longitude)))

  const toInsert = []
  const byCategory = {}
  let skipped = 0

  for (const place of sfPlaces) {
    const key = coordKey(place.name, place.latitude, place.longitude)
    if (seen.has(key)) {
      skipped += 1
      continue
    }
    seen.add(key) // also dedupes within the dataset itself
    toInsert.push(toPin(place))
    byCategory[place.category] = (byCategory[place.category] ?? 0) + 1
  }

  if (toInsert.length === 0) {
    console.log(`Nothing new to insert (${skipped} already present).`)
    return
  }

  const result = await prisma.pin.createMany({ data: toInsert, skipDuplicates: true })

  console.log(`Inserted ${result.count} catalog pins (${skipped} skipped as duplicates).`)
  console.log('By category:', byCategory)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
