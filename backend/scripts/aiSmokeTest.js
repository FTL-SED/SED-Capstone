// Manual smoke test for the AI itinerary sequencing service (Step 6/9 follow-
// up, see .claude/roadmap/ai-itinerary-sequencing.md). Runs generateItinerary()
// against a small mock SF shortlist and prints the sequenced day, so you can
// eyeball whether the AI (or fallback) output looks reasonable — and whether
// the AI path or the deterministic fallback actually ran.
//
// This calls the service directly (no server, no auth, no DB) so it exercises
// the REAL model-gateway call. Needs AI_KEY and NODE_EXTRA_CA_CERTS in .env.
//
// Run from backend/:  node scripts/aiSmokeTest.js
import 'dotenv/config'

import { generateItinerary } from '../services/ai/index.js'

// A small, realistic SF shortlist — the shape services/recommendation produces
// (each pin has id, name, category, coords, price, hours). Mixed activities +
// restaurants so meal placement has something to work with.
const shortlist = [
  { id: 1, name: 'Ferry Building Marketplace', category: 'activity', tags: ['food', 'shopping'], latitude: 37.7955, longitude: -122.3937, pricePerPerson: 0, openingHours: [{ open: '10:00', close: '18:00' }] },
  { id: 2, name: 'Coit Tower', category: 'activity', tags: ['views', 'landmark'], latitude: 37.8024, longitude: -122.4058, pricePerPerson: 10, openingHours: [{ open: '10:00', close: '17:00' }] },
  { id: 3, name: 'Tartine Bakery', category: 'restaurant', tags: ['bakery', 'cafe'], latitude: 37.7614, longitude: -122.4241, pricePerPerson: 20, openingHours: [{ open: '08:00', close: '17:00' }] },
  { id: 4, name: 'Golden Gate Park', category: 'activity', tags: ['nature', 'parks'], latitude: 37.7694, longitude: -122.4862, pricePerPerson: 0, openingHours: [{ open: '06:00', close: '22:00' }] },
  { id: 5, name: 'Zuni Cafe', category: 'restaurant', tags: ['american', 'dinner'], latitude: 37.7734, longitude: -122.4225, pricePerPerson: 45, openingHours: [{ open: '11:30', close: '22:00' }] },
  { id: 6, name: 'de Young Museum', category: 'activity', tags: ['art', 'museum'], latitude: 37.7715, longitude: -122.4687, pricePerPerson: 20, openingHours: [{ open: '09:30', close: '17:15' }] },
]

const constraints = {
  timeWindow: { startTime: '09:00', endTime: '21:00' },
  maxBudgetPerPerson: 120,
  groupSize: 4,
  startingLocations: ['Mission District', 'SoMa'],
}

function printItinerary(itinerary) {
  console.log(`\n📋 ${itinerary.title}`)
  console.log(`📍 ${itinerary.location}`)
  console.log(`   ${itinerary.description}\n`)

  const byId = new Map(shortlist.map((p) => [p.id, p]))
  let total = 0
  for (const [i, stop] of itinerary.stops.entries()) {
    const pin = byId.get(stop.pinId)
    const cost = pin?.pricePerPerson ?? 0 // cost is a fact of the place, from the shortlist
    const meal = stop.mealType ? `  [${stop.mealType}]` : ''
    console.log(`  ${i + 1}. ${stop.arriveTime}–${stop.departTime}  ${pin?.name ?? `pin ${stop.pinId}`}${meal}`)
    console.log(`       $${cost}/person${stop.note ? ` — ${stop.note}` : ''}`)
    if (stop.travelTimeToNextMinutes != null) {
      console.log(`       ↓ ${stop.travelTimeToNextMinutes} min / ${stop.distanceToNextMeters} m to next`)
    }
    total += cost
  }
  console.log(`\n   Total: $${total}/person  (cap $${constraints.maxBudgetPerPerson})`)
}

async function main() {
  console.log('Generating itinerary from a 6-pin SF shortlist...')
  const result = await generateItinerary(shortlist, constraints)

  if (result.feasible === false) {
    console.log(`\n❌ Infeasible: ${result.reason}`)
    return
  }

  console.log(`\n✅ Source: ${result.source.toUpperCase()}` +
    (result.source === 'fallback' ? ' (AI failed/invalid — deterministic sequencer ran)' : ' (AI-generated)'))
  printItinerary(result.itinerary)
}

main().catch((err) => {
  console.error('Smoke test failed:', err)
  process.exit(1)
})
