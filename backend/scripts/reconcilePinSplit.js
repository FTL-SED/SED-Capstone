// backend/scripts/reconcilePinSplit.js
// Read-only verification that Phase 2's backfill is complete and correct.
// Checks:
//   1. stop count == attached-pin count, and every attached Pin
//      (itineraryId + orderInItinerary) maps to a matching ItineraryStop.
//   2. Every ItineraryStop.pinId resolves to an existing Pin.
//   3. Per-itinerary stop order is preserved: for each itinerary the SET of
//      orderInItinerary values on its stops equals that on its attached pins.
//   4. The explicit-field backfill ran: no food-tagged Pin is still the
//      Phase-1 default 'activity', and every restaurant carries the expected
//      cuisines/diets derived from its tags (spot-checked via classifyTags).
//   5. mealType extraction ran: every stop whose source pin has a meal word
//      (breakfast/lunch/dinner) in its tags carries the matching mealType.
import prisma from '../lib/prisma.js'
import { FOOD_INDICATOR_TAGS, CUISINE_TAGS, DIET_TAGS } from '../config/tagVocab.js'
import { classifyTags, MEAL_TAGS } from '../services/recommendation/pinsRepository/classify.js'

const MEAL_SET = new Set(MEAL_TAGS)

async function main() {
  const problems = []

  const attached = await prisma.pin.findMany({
    where: { NOT: { itineraryId: null } },
    select: { id: true, itineraryId: true, orderInItinerary: true, tags: true },
  })
  const stops = await prisma.itineraryStop.findMany({
    select: { itineraryId: true, orderInItinerary: true, pinId: true, mealType: true },
  })

  // 1. counts
  if (stops.length !== attached.length) {
    problems.push(`stop count ${stops.length} != attached-pin count ${attached.length}`)
  }

  // 1b. every attached pin has a matching stop
  const stopKeys = new Set(stops.map((s) => `${s.itineraryId}|${s.orderInItinerary}`))
  for (const p of attached) {
    if (!stopKeys.has(`${p.itineraryId}|${p.orderInItinerary}`)) {
      problems.push(`attached pin ${p.itineraryId}|${p.orderInItinerary} has no ItineraryStop`)
    }
  }

  // 2. every stop.pinId resolves
  const pinIds = new Set((await prisma.pin.findMany({ select: { id: true } })).map((p) => p.id))
  for (const s of stops) {
    if (!pinIds.has(s.pinId)) problems.push(`stop pinId ${s.pinId} does not resolve to a Pin`)
  }

  // 3. per-itinerary order sets match (attached pins vs their stops)
  const ordersByItin = (rows) => {
    const m = new Map()
    for (const r of rows) {
      if (!m.has(r.itineraryId)) m.set(r.itineraryId, new Set())
      m.get(r.itineraryId).add(r.orderInItinerary)
    }
    return m
  }
  const attachedOrders = ordersByItin(attached)
  const stopOrders = ordersByItin(stops)
  for (const [itin, orders] of attachedOrders) {
    const s = stopOrders.get(itin) ?? new Set()
    const same = orders.size === s.size && [...orders].every((o) => s.has(o))
    if (!same) {
      problems.push(`itinerary ${itin}: stop order set does not match attached-pin order set`)
    }
  }

  // 4. explicit-field backfill: derive the expected values from tags via the same
  // classifier the backfill used, and confirm the stored columns match. Probe a
  // sample of food pins so a bug that sets category but leaves cuisines/diets
  // empty is caught (the earlier hardcoded-tag check missed that).
  const foodVocab = [...FOOD_INDICATOR_TAGS, ...CUISINE_TAGS, ...DIET_TAGS]
  const foodPins = await prisma.pin.findMany({
    where: { tags: { hasSome: foodVocab } },
    select: { id: true, tags: true, category: true, cuisines: true, diets: true },
  })
  const setEq = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')
  for (const p of foodPins) {
    const expected = classifyTags(p.tags)
    if (p.category !== expected.category) {
      problems.push(`pin ${p.id}: category '${p.category}' != expected '${expected.category}'`)
    }
    if (!setEq(p.cuisines, expected.cuisines)) {
      problems.push(`pin ${p.id}: cuisines [${p.cuisines}] != expected [${expected.cuisines}]`)
    }
    if (!setEq(p.diets, expected.diets)) {
      problems.push(`pin ${p.id}: diets [${p.diets}] != expected [${expected.diets}]`)
    }
  }

  // 5. mealType extraction: each stop whose source pin tags carry a meal word
  // must have the matching mealType.
  const pinTagsById = new Map(attached.map((p) => [p.id, p.tags ?? []]))
  for (const s of stops) {
    const expectedMeal = (pinTagsById.get(s.pinId) ?? []).find((t) => MEAL_SET.has(t)) ?? null
    if (expectedMeal !== null && s.mealType !== expectedMeal) {
      problems.push(
        `stop ${s.itineraryId}|${s.orderInItinerary}: mealType '${s.mealType}' != expected '${expectedMeal}'`,
      )
    }
  }

  if (problems.length > 0) {
    console.error('RECONCILIATION FAILED:')
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(
    `Reconciliation OK: ${stops.length} stops match ${attached.length} attached pins; ` +
      `all pinIds resolve; per-itinerary order preserved; ${foodPins.length} food pins ` +
      `match classifyTags; mealType extraction verified.`,
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
