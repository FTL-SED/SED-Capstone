// Manual QA tool for the recommendation engine (Step 9 follow-up, see
// .claude/roadmap/recommendation-engine.md). Runs a handful of realistic
// constraint scenarios against the REAL seeded Pin catalog and prints a
// human-readable report: category mix, food quota, score spread, fairness
// coverage, budget compliance, missing-data flags. The unit + integration
// tests prove the engine implements the design correctly; this is for
// eyeballing whether the *recommendations themselves* look reasonable,
// especially as the seeded catalog grows.
//
// Run from backend/: npm run quality-report
import 'dotenv/config'

import prisma from '../lib/prisma.js'
import { getRecommendations } from '../services/recommendation/index.js'
import { memberLikes } from '../services/recommendation/score/score.js'
import { estPricePerPerson } from '../services/recommendation/helpers/helpers.js'
import { FOOD_MIN, FOOD_MAX } from '../config/recommendation.js'

const scenarios = [
  {
    label: 'Art + hiking duo, mid budget',
    trip: { startTime: '09:00', endTime: '18:00', maxBudgetPerPerson: 60 },
    members: [
      { name: 'Alex', startLocation: { latitude: 37.7880, longitude: -122.4074 }, interestTags: ['art', 'scenic_views'], foodPrefs: ['mexican'] },
      { name: 'Sam', startLocation: { latitude: 37.7599, longitude: -122.4148 }, interestTags: ['hiking'], foodPrefs: ['ramen'] },
    ],
  },
  {
    label: 'Tight budget + vegan diet',
    trip: { startTime: '10:00', endTime: '15:00', maxBudgetPerPerson: 15 },
    members: [
      { name: 'Priya', startLocation: { latitude: 37.7599, longitude: -122.4869 }, interestTags: ['nature'], foodPrefs: [], diet: ['vegan'] },
    ],
  },
  {
    label: 'One member with a totally niche interest',
    trip: { startTime: '09:00', endTime: '18:00', maxBudgetPerPerson: 60 },
    members: [
      { name: 'Jordan', startLocation: { latitude: 37.7880, longitude: -122.4074 }, interestTags: ['art'], foodPrefs: ['mexican'] },
      { name: 'Casey', startLocation: { latitude: 37.7801, longitude: -122.4644 }, interestTags: ['kayaking'], foodPrefs: [] },
    ],
  },
]

function printScenario({ label, trip, members }, { shortlist, constraints }) {
  console.log(`\n=== ${label} ===`)
  console.log(`trip: ${trip.startTime}-${trip.endTime}, budget/person: $${trip.maxBudgetPerPerson}`)
  console.log(`members: ${members.map((m) => m.name).join(', ')}`)
  console.log(`constraints: ${JSON.stringify(constraints)}`)
  console.log(`shortlist size: ${shortlist.length}`)

  const categoryCounts = {}
  for (const place of shortlist) {
    categoryCounts[place.category] = (categoryCounts[place.category] ?? 0) + 1
  }
  console.log(`categories: ${JSON.stringify(categoryCounts)} (${Object.keys(categoryCounts).length} distinct)`)

  const foodCount = categoryCounts.restaurant ?? 0
  const foodInBounds = foodCount >= FOOD_MIN && foodCount <= FOOD_MAX
  console.log(
    `food count: ${foodCount} (${foodInBounds ? 'within' : 'OUTSIDE'} [${FOOD_MIN}, ${FOOD_MAX}]` +
      `${!foodInBounds && foodCount < FOOD_MIN ? ' — likely a thin-catalog gap, not an engine bug' : ''})`
  )

  const scores = shortlist.map((p) => p.score).filter((s) => typeof s === 'number')
  if (scores.length > 0) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    console.log(
      `score range: ${Math.min(...scores).toFixed(2)}-${Math.max(...scores).toFixed(2)}, avg ${avg.toFixed(2)}`
    )
  }

  console.log('fairness coverage:')
  for (const member of members) {
    const covered = shortlist.some((p) => memberLikes(p, member))
    console.log(`  ${covered ? '✓' : '✗ NOT covered — no matching seed data'} ${member.name}`)
  }

  const overBudget = shortlist.filter((p) => {
    const price = estPricePerPerson(p)
    return price != null && price > trip.maxBudgetPerPerson
  })
  console.log(
    `budget violations: ${overBudget.length}` +
      (overBudget.length ? ` — ${overBudget.map((p) => p.name).join(', ')}` : '')
  )

  const flagged = shortlist.filter((p) => p.priceUnknown || p.hoursUnknown)
  console.log(`missing-data flags: ${flagged.length}/${shortlist.length} places flagged`)

  console.log('places:')
  for (const place of shortlist) {
    const price = estPricePerPerson(place)
    console.log(
      `  - ${place.name} [${place.category}] score=${place.score?.toFixed(2) ?? 'n/a'} ` +
        `price=${price ?? 'unknown'} tags=${place.tags?.join(',') ?? ''}`
    )
  }
}

async function main() {
  for (const scenario of scenarios) {
    const result = await getRecommendations(scenario.trip, scenario.members)
    printScenario(scenario, result)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
