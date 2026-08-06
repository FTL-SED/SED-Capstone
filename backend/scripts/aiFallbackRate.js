// Throwaway measurement for the ai-speed-up-sprint: how often does the live AI
// model produce a valid itinerary vs. dropping to the deterministic fallback,
// and how long does it take? Runs each realistic scenario N times (the model is
// nondeterministic), tallying source (ai|fallback), latency, and — for AI
// successes — a couple of quality signals (stop count vs target, budget headroom).
//
// Run from backend/ with the OpenAI key set: node scripts/aiFallbackRate.js
import 'dotenv/config'

import prisma from '../lib/prisma.js'
import { getRecommendations } from '../services/recommendation/index.js'
import { generateItinerary } from '../services/ai/index.js'
import { getAiClient } from '../lib/aiClient.js'

const RUNS_PER_SCENARIO = 5

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
    label: 'Foodie trio, wide window, higher budget',
    trip: { startTime: '10:00', endTime: '20:00', maxBudgetPerPerson: 90 },
    members: [
      { name: 'Jordan', startLocation: { latitude: 37.7880, longitude: -122.4074 }, interestTags: ['art'], foodPrefs: ['mexican'] },
      { name: 'Casey', startLocation: { latitude: 37.7801, longitude: -122.4644 }, interestTags: ['music'], foodPrefs: ['ramen'] },
      { name: 'Lee', startLocation: { latitude: 37.7699, longitude: -122.4269 }, interestTags: ['scenic_views'], foodPrefs: ['italian'] },
    ],
  },
]

const pct = (n, d) => (d === 0 ? 'n/a' : `${Math.round((n / d) * 100)}%`)

async function runScenario(scenario) {
  const { shortlist, constraints } = await getRecommendations(scenario.trip, scenario.members)
  const targetStops = constraints?.targetStops

  let ai = 0
  let fallback = 0
  let infeasible = 0
  const aiLatencies = []
  const aiStopCounts = []

  for (let i = 0; i < RUNS_PER_SCENARIO; i++) {
    const start = process.hrtime.bigint()
    let result
    try {
      result = await generateItinerary(shortlist, constraints)
    } catch (err) {
      console.log(`  run ${i + 1}: ERROR ${err.message}`)
      continue
    }
    const ms = Number(process.hrtime.bigint() - start) / 1e6

    if (result.feasible === false) {
      infeasible++
      console.log(`  run ${i + 1}: infeasible (${result.reason})`)
      continue
    }
    if (result.source === 'ai') {
      ai++
      aiLatencies.push(ms)
      aiStopCounts.push(result.itinerary.stops.length)
    } else {
      fallback++
    }
    console.log(`  run ${i + 1}: ${result.source.padEnd(8)} ${Math.round(ms)}ms  stops=${result.itinerary.stops.length}`)
  }

  const total = ai + fallback + infeasible
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  console.log(`  → AI ${ai}/${total} (${pct(ai, total)}), fallback ${fallback}/${total} (${pct(fallback, total)})`)
  if (aiLatencies.length) {
    console.log(
      `  → AI latency avg ${Math.round(avg(aiLatencies))}ms (min ${Math.round(Math.min(...aiLatencies))}, max ${Math.round(Math.max(...aiLatencies))})`
    )
    console.log(`  → AI stops avg ${avg(aiStopCounts).toFixed(1)} vs target ${targetStops ?? 'n/a'}`)
  }
  return { ai, fallback, infeasible }
}

async function main() {
  const { provider, model } = getAiClient()
  console.log(`Provider: ${provider} | Model: ${model} | ${RUNS_PER_SCENARIO} runs/scenario\n`)

  const totals = { ai: 0, fallback: 0, infeasible: 0 }
  for (const scenario of scenarios) {
    console.log(`=== ${scenario.label} ===`)
    console.log(`trip: ${scenario.trip.startTime}-${scenario.trip.endTime}, budget/person $${scenario.trip.maxBudgetPerPerson}`)
    const r = await runScenario(scenario)
    totals.ai += r.ai
    totals.fallback += r.fallback
    totals.infeasible += r.infeasible
    console.log('')
  }

  const grand = totals.ai + totals.fallback + totals.infeasible
  console.log('=== OVERALL ===')
  console.log(`AI success:  ${totals.ai}/${grand} (${pct(totals.ai, grand)})`)
  console.log(`Fallback:    ${totals.fallback}/${grand} (${pct(totals.fallback, grand)})`)
  console.log(`Infeasible:  ${totals.infeasible}/${grand} (${pct(totals.infeasible, grand)})`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
