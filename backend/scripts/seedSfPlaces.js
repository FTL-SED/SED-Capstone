import 'dotenv/config'

import { PrismaClient } from '@prisma/client'

import sfPlaces from '../prisma/data/sfPlaces/index.js'
import { classifyTags } from '../services/recommendation/pinsRepository/classify.js'

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

// Catalog pins carry a neutral all-day SF window as their hoursOpen so the
// engine's isOpenInWindow stays permissive. Phase 3 uses explicit hours.
const ALL_DAY_HOURS = {
  mon: '08:00-22:00',
  tue: '08:00-22:00',
  wed: '08:00-22:00',
  thu: '08:00-22:00',
  fri: '08:00-22:00',
  sat: '08:00-22:00',
  sun: '08:00-22:00',
}

// OSM/dataset coords carry ~4 decimals; round to the same precision so the
// dedupe key is stable across the DB round-trip.
function coordKey(name, latitude, longitude) {
  return `${name}|${latitude.toFixed(4)}|${longitude.toFixed(4)}`
}

// A dataset place -> a full Pin row. Catalog places have no real photo, so
// locationImageUrl is left null; the UI falls back to a placeholder image.
// Post-Phase 2: writes explicit category/interests/cuisines/diets instead of
// legacy per-visit columns (itineraryId, orderInItinerary, startTime, endTime).
function toPin(place) {
  const { category, interests, cuisines, diets } = classifyTags(place.tags)
  return {
    name: place.name,
    description: place.description,
    category,
    interests,
    cuisines,
    diets,
    hoursOpen: ALL_DAY_HOURS,
    rating: place.rating,
    pricePerPerson: place.pricePerPerson,
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.address,
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
