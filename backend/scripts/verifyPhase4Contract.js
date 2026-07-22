// End-to-end contract verification for Phase 4: confirms that the itinerary
// model's reshape produces the legacy pins[] shape from real ItineraryStop data.
// Read-only; exits 0 if all itineraries have well-formed pins[], non-zero otherwise.

import * as itineraries from '../models/itineraries.js'

async function main() {
  console.log('Phase 4 contract verification: loading itineraries via model layer...\n')

  // Load id list via findMany (the feed query is intentionally stops-free), then
  // fetch each through findById — the DETAIL query that still includes stops->pin,
  // so this actually exercises reshapeItinerary's pins[] flattening.
  const summaries = await itineraries.findMany({
    where: {},
    orderBy: { createdAt: 'desc' },
    take: 100,
    skip: 0,
  })
  const rows = (await Promise.all(summaries.map((s) => itineraries.findById(s.id)))).filter(Boolean)

  console.log(`Loaded ${rows.length} itineraries\n`)

  const problems = []
  let totalPins = 0

  for (const itinerary of rows) {
    const { id, title, pins, stops, likeCount } = itinerary
    const pinCount = pins?.length ?? 0
    totalPins += pinCount

    console.log(`- Itinerary ${id} "${title}": ${pinCount} pins, likeCount=${likeCount}`)

    // Assert likeCount is a number
    if (typeof likeCount !== 'number') {
      problems.push({
        itineraryId: id,
        itineraryTitle: title,
        issue: `likeCount is not a number (got ${typeof likeCount})`,
      })
    }

    // Assert pins[] exists and no stops key leaked
    if (!Array.isArray(pins)) {
      problems.push({
        itineraryId: id,
        itineraryTitle: title,
        issue: `pins is not an array (got ${typeof pins})`,
      })
      continue // Can't check individual pins if pins isn't an array
    }

    if (stops !== undefined) {
      problems.push({
        itineraryId: id,
        itineraryTitle: title,
        issue: 'stops key leaked (should not be present in reshaped output)',
      })
    }

    // Assert each pin has all frontend-read fields with correct types
    for (let i = 0; i < pins.length; i++) {
      const pin = pins[i]
      const pinPrefix = `pin[${i}] (order=${pin.orderInItinerary ?? '?'})`

      // Required string fields
      if (typeof pin.name !== 'string') {
        problems.push({
          itineraryId: id,
          itineraryTitle: title,
          issue: `${pinPrefix}: name is not a string (got ${typeof pin.name})`,
        })
      }

      // Required number fields
      if (typeof pin.latitude !== 'number') {
        problems.push({
          itineraryId: id,
          itineraryTitle: title,
          issue: `${pinPrefix}: latitude is not a number (got ${typeof pin.latitude})`,
        })
      }
      if (typeof pin.longitude !== 'number') {
        problems.push({
          itineraryId: id,
          itineraryTitle: title,
          issue: `${pinPrefix}: longitude is not a number (got ${typeof pin.longitude})`,
        })
      }
      if (typeof pin.pricePerPerson !== 'number') {
        problems.push({
          itineraryId: id,
          itineraryTitle: title,
          issue: `${pinPrefix}: pricePerPerson is not a number (got ${typeof pin.pricePerPerson})`,
        })
      }
      if (typeof pin.orderInItinerary !== 'number') {
        problems.push({
          itineraryId: id,
          itineraryTitle: title,
          issue: `${pinPrefix}: orderInItinerary is not a number (got ${typeof pin.orderInItinerary})`,
        })
      }

      // Required Date/ISO fields (may be Date objects or ISO strings)
      if (!(pin.startTime instanceof Date) && typeof pin.startTime !== 'string') {
        problems.push({
          itineraryId: id,
          itineraryTitle: title,
          issue: `${pinPrefix}: startTime is not a Date or string (got ${typeof pin.startTime})`,
        })
      }
      if (!(pin.endTime instanceof Date) && typeof pin.endTime !== 'string') {
        problems.push({
          itineraryId: id,
          itineraryTitle: title,
          issue: `${pinPrefix}: endTime is not a Date or string (got ${typeof pin.endTime})`,
        })
      }

      // Required array field
      if (!Array.isArray(pin.tags)) {
        problems.push({
          itineraryId: id,
          itineraryTitle: title,
          issue: `${pinPrefix}: tags is not an array (got ${typeof pin.tags})`,
        })
      }

      // Keys that must exist (may be null/undefined, but key must be present)
      const optionalKeys = ['address', 'locationImageUrl', 'description', 'mealType']
      for (const key of optionalKeys) {
        if (!(key in pin)) {
          problems.push({
            itineraryId: id,
            itineraryTitle: title,
            issue: `${pinPrefix}: ${key} key is missing`,
          })
        }
      }
    }
  }

  console.log(`\n--- Verification complete ---\n`)

  if (problems.length > 0) {
    console.error(`❌ Found ${problems.length} problem(s):\n`)
    for (const p of problems) {
      console.error(`  Itinerary ${p.itineraryId} "${p.itineraryTitle}": ${p.issue}`)
    }
    console.error(`\nPhase 4 contract FAILED\n`)
    process.exit(1)
  } else {
    console.log(
      `✓ Phase 4 contract OK: ${rows.length} itineraries, ${totalPins} pins, all well-formed\n`
    )
    process.exit(0)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Script failed with error:')
    console.error(err)
    process.exit(1)
  })
