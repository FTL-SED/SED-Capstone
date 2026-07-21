// One-off, idempotent: repoints every ItineraryStop from its legacy attached pin
// to an equivalent catalog venue (itineraryId = null). For the 26 attached pins
// with no exact catalog twin by name+coords, creates a venue on the fly. After
// running, 0 stops reference an attached pin — enabling Phase 5.4 to safely delete
// the leftover attached-pin rows.
import prisma from '../lib/prisma.js'
import { classifyTags } from '../services/recommendation/pinsRepository/classify.js'

function key(pin) {
  return `${pin.name}|${pin.latitude.toFixed(4)}|${pin.longitude.toFixed(4)}`
}

async function main() {
  // Load all attached pins and catalog pins
  const attachedPins = await prisma.pin.findMany({
    where: { NOT: { itineraryId: null } },
    select: {
      id: true,
      name: true,
      description: true,
      latitude: true,
      longitude: true,
      address: true,
      pricePerPerson: true,
      rating: true,
      locationImageUrl: true,
      hoursOpen: true,
      tags: true,
    },
  })

  const catalogPins = await prisma.pin.findMany({
    where: { itineraryId: null },
    select: { id: true, name: true, latitude: true, longitude: true },
  })

  // Build key → catalogPinId map
  const keyToVenueId = new Map()
  for (const pin of catalogPins) {
    keyToVenueId.set(key(pin), pin.id)
  }

  // Create catalog venues for attached pins lacking an exact twin
  let venuesCreated = 0
  const seenKeys = new Set() // dedupe within this batch

  for (const pin of attachedPins) {
    const pinKey = key(pin)
    if (keyToVenueId.has(pinKey) || seenKeys.has(pinKey)) continue

    seenKeys.add(pinKey)
    const { category, interests, cuisines, diets } = classifyTags(pin.tags)

    // Use neutral all-day hours if none exist
    const hoursOpen =
      pin.hoursOpen ||
      Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, '08:00-22:00']))

    const venue = await prisma.pin.create({
      data: {
        itineraryId: null,
        orderInItinerary: 0,
        name: pin.name,
        description: pin.description,
        latitude: pin.latitude,
        longitude: pin.longitude,
        address: pin.address,
        pricePerPerson: pin.pricePerPerson,
        rating: pin.rating,
        locationImageUrl: pin.locationImageUrl,
        hoursOpen,
        category,
        interests,
        cuisines,
        diets,
        tags: [], // catalog venues don't need legacy tags
        startTime: new Date('2026-08-15T15:00:00.000Z'), // neutral placeholder
        endTime: new Date('2026-08-16T05:00:00.000Z'),
      },
    })

    keyToVenueId.set(pinKey, venue.id)
    venuesCreated++
  }

  // Repoint ItineraryStops to catalog venues
  const stops = await prisma.itineraryStop.findMany({
    include: { pin: { select: { name: true, latitude: true, longitude: true } } },
  })

  let repointed = 0
  let alreadyCorrect = 0

  for (const stop of stops) {
    const pinKey = key(stop.pin)
    const venueId = keyToVenueId.get(pinKey)

    if (!venueId) {
      console.warn(`⚠️  No venue found for stop ${stop.id} (pin key: ${pinKey})`)
      continue
    }

    if (stop.pinId === venueId) {
      alreadyCorrect++
      continue
    }

    await prisma.itineraryStop.update({
      where: { id: stop.id },
      data: { pinId: venueId },
    })
    repointed++
  }

  console.log(
    `Created ${venuesCreated} catalog venues; repointed ${repointed} stops (${alreadyCorrect} already correct).`,
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
