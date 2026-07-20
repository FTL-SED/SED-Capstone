# Pin Split Phase 2 Implementation Plan — Backfill

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the new columns/table added in Phase 1 with real data derived from the existing `Pin` rows — the explicit `category`/`interests`/`cuisines`/`diets` fields on every pin, and one `ItineraryStop` row per existing itinerary-attached pin — without changing any app behavior.

**Architecture:** Two offline, idempotent scripts plus a reconciliation check. They only WRITE the new Phase 1 surface (`Pin.category/interests/cuisines/diets`, the `ItineraryStop` table); they do NOT modify the legacy columns (`tags`, `itineraryId`, `orderInItinerary`, times) and nothing reads the new data yet. The old `Pin` rows stay in place as a fallback until Phase 5. Design: `docs/superpowers/specs/2026-07-20-pin-split-design.md`.

**Tech Stack:** Node ESM, Prisma + PostgreSQL (Supabase), `node:test`.

## Global Constraints

- Backend is ESM (`"type": "module"`); `import`/`export`, `.js` extensions in import paths — from `backend/CLAUDE.md`.
- All DB access goes through the shared `lib/prisma.js` singleton; never `new PrismaClient()`.
- Scripts run from `backend/` (that's where `.env` + `prisma/` live).
- Scripts must be **idempotent**: safe to re-run, second run is a no-op or produces identical state.
- Never commit to `main`; work on branch `dylan-pin-split-phase2` (branched off `dylan-pin-split`). No `Co-Authored-By` trailer.
- Current test baseline: **217 tests green**. Every task keeps it green (these scripts add no runtime behavior, but their pure helpers get unit tests).
- Match the error-handling convention of `scripts/seedSfPlaces.js` / `scripts/backfillHoursOpen.js`: `main().catch(err => { console.error(err); process.exit(1) }).finally(() => prisma.$disconnect())`.

## Current data facts (verified against the live DB, 2026-07-20)

- **524 pins total** = 399 catalog (`itineraryId = null`) + 125 itinerary-attached.
- **424 unique venues** by `name + coords(4dp)`; 51 name+coord groups have >1 row (real-world duplicates across itineraries).
- The new columns exist but are unpopulated: every pin currently reads `category = "activity"` (the Phase 1 default), `interests/cuisines/diets = []`, regardless of its `tags`. Example: a pin with `tags: ['food','chinese','dinner']` still shows `category: "activity"`, `cuisines: []`.
- Some attached pins bake a meal word into `tags` (e.g. "Dinner at Nopa" → `tags: ['food','dinner','californian']`). Meal words are `breakfast`/`lunch`/`dinner`.

## Derivation logic to replicate (from `services/recommendation/pinsRepository/pinsRepository.js` `mapPin`)

The classification Phase 2.1 must reproduce, using `config/tagVocab.js`:
- `cuisines` = `tags` ∩ `CUISINE_TAGS`
- `diets` = `tags` ∩ `DIET_TAGS`
- `category` = `"restaurant"` if (`tags` has any `FOOD_INDICATOR_TAGS` OR cuisines non-empty OR diets non-empty), else `"activity"`
- `interests` = the remaining tags that are NOT cuisine, NOT diet, NOT a food-indicator, and NOT a meal word — i.e. the genuine activity/interest tags.

---

## Task 2.0: Create the Phase 2 branch

**Files:** none (git only)

- [ ] **Step 1: Branch off the Phase 1 tip**

Run:
```bash
cd /Users/ddrozario/codepath/SED-Capstone && git checkout dylan-pin-split && git checkout -b dylan-pin-split-phase2
```
Expected: "Switched to a new branch 'dylan-pin-split-phase2'".

- [ ] **Step 2: Confirm the baseline**

Run: `cd backend && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `pass 217`, `fail 0`.

---

## Task 2.1: Pin-field classifier (pure helper + tests)

**Files:**
- Create: `backend/services/recommendation/pinsRepository/classify.js`
- Test: `backend/services/recommendation/pinsRepository/classify.test.js`

**Interfaces:**
- Consumes: `FOOD_INDICATOR_TAGS`, `CUISINE_TAGS`, `DIET_TAGS` from `config/tagVocab.js`.
- Produces: `classifyTags(tags)` → `{ category: 'restaurant'|'activity', interests: string[], cuisines: string[], diets: string[] }`. Pure, no DB. Splitting each tag into exactly one bucket (or dropping meal words), so the four output arrays are the explicit-column values for a pin.
- Produces: `MEAL_TAGS` = `['breakfast','lunch','dinner']` (exported for reuse by Task 2.2).

- [ ] **Step 1: Write the failing test**

```js
// backend/services/recommendation/pinsRepository/classify.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyTags, MEAL_TAGS } from './classify.js'

test('classifyTags: a cuisine tag makes it a restaurant and fills cuisines', () => {
  const r = classifyTags(['food', 'chinese', 'dinner'])
  assert.equal(r.category, 'restaurant')
  assert.deepEqual(r.cuisines, ['chinese'])
  assert.deepEqual(r.diets, [])
  // 'food' is a food-indicator, 'dinner' is a meal word — neither is an interest
  assert.deepEqual(r.interests, [])
})

test('classifyTags: activity tags stay interests, category activity', () => {
  const r = classifyTags(['scenic_views', 'landmark', 'photography'])
  assert.equal(r.category, 'activity')
  assert.deepEqual(r.cuisines, [])
  assert.deepEqual(r.diets, [])
  assert.deepEqual(r.interests, ['scenic_views', 'landmark', 'photography'])
})

test('classifyTags: a diet tag alone marks restaurant and fills diets', () => {
  const r = classifyTags(['vegan'])
  // 'vegan' is in both CUISINE_TAGS and DIET_TAGS, so it lands in both
  assert.equal(r.category, 'restaurant')
  assert.ok(r.diets.includes('vegan'))
})

test('classifyTags: mixed food+activity tags — food wins category, non-food stays interests', () => {
  const r = classifyTags(['food', 'mexican', 'casual'])
  assert.equal(r.category, 'restaurant')
  assert.deepEqual(r.cuisines, ['mexican'])
  assert.deepEqual(r.interests, ['casual']) // 'casual' isn't cuisine/diet/food/meal
})

test('classifyTags: empty tags → activity, all arrays empty', () => {
  const r = classifyTags([])
  assert.deepEqual(r, { category: 'activity', interests: [], cuisines: [], diets: [] })
})

test('classifyTags: undefined tags → activity, all arrays empty', () => {
  const r = classifyTags(undefined)
  assert.deepEqual(r, { category: 'activity', interests: [], cuisines: [], diets: [] })
})

test('MEAL_TAGS lists the three meal words', () => {
  assert.deepEqual(MEAL_TAGS, ['breakfast', 'lunch', 'dinner'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && node --test services/recommendation/pinsRepository/classify.test.js`
Expected: FAIL — `Cannot find module './classify.js'`.

- [ ] **Step 3: Write the implementation**

```js
// backend/services/recommendation/pinsRepository/classify.js
// Splits a Pin's free-form `tags` array into the explicit column values
// (category/interests/cuisines/diets). Replicates the derivation that
// pinsRepository.mapPin does at read-time today, so Phase 2's backfill can
// persist those values as real columns. Pure — no DB.
import { FOOD_INDICATOR_TAGS, CUISINE_TAGS, DIET_TAGS } from '../../../config/tagVocab.js'

const MEAL_TAGS = ['breakfast', 'lunch', 'dinner']
const MEAL_SET = new Set(MEAL_TAGS)

function classifyTags(tags) {
  const list = Array.isArray(tags) ? tags : []
  const cuisines = list.filter((t) => CUISINE_TAGS.has(t))
  const diets = list.filter((t) => DIET_TAGS.has(t))
  const isFood =
    list.some((t) => FOOD_INDICATOR_TAGS.has(t)) || cuisines.length > 0 || diets.length > 0
  // Interests = tags that aren't cuisine, diet, a food-indicator, or a meal word.
  const interests = list.filter(
    (t) =>
      !CUISINE_TAGS.has(t) &&
      !DIET_TAGS.has(t) &&
      !FOOD_INDICATOR_TAGS.has(t) &&
      !MEAL_SET.has(t),
  )
  return { category: isFood ? 'restaurant' : 'activity', interests, cuisines, diets }
}

export { classifyTags, MEAL_TAGS }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && node --test services/recommendation/pinsRepository/classify.test.js`
Expected: PASS (7 tests).

- [ ] **Step 5: Run the full suite**

Run: `cd backend && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `pass 224` (217 + 7), `fail 0`.

- [ ] **Step 6: Commit**

```bash
cd backend && git add services/recommendation/pinsRepository/classify.js services/recommendation/pinsRepository/classify.test.js
git commit -m "Add Pin tag classifier for the explicit-column backfill"
```

---

## Task 2.2: Backfill the explicit tag columns on every Pin

**Files:**
- Create: `backend/scripts/backfillPinFields.js`

**Interfaces:**
- Consumes: `classifyTags` from `services/recommendation/pinsRepository/classify.js`.
- Produces: an idempotent script that sets `category`/`interests`/`cuisines`/`diets` on every `Pin` from its `tags`. Writes only these four columns; leaves `tags` and everything else untouched.

- [ ] **Step 1: Write the script**

```js
// backend/scripts/backfillPinFields.js
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
```

- [ ] **Step 2: Run it**

Run: `cd backend && node scripts/backfillPinFields.js`
Expected: `Backfilled explicit tag fields on 524 pins.`

- [ ] **Step 3: Spot-check the derivation landed correctly**

Run:
```bash
cd backend && node -e "import('./lib/prisma.js').then(async ({default:p}) => {
  const r = await p.pin.findFirst({ where: { cuisines: { has: 'chinese' } }, select: { name:true, category:true, cuisines:true, interests:true } });
  console.log(JSON.stringify(r));
  const stillDefault = await p.pin.count({ where: { category: 'activity', tags: { hasSome: ['food','mexican','chinese','italian'] } } });
  console.log('food-tagged pins still miscategorized as activity:', stillDefault);
  process.exit(0);
})"
```
Expected: the sample pin shows `category: "restaurant"` with its cuisine; `food-tagged pins still miscategorized as activity: 0`.

- [ ] **Step 4: Verify idempotency**

Run: `cd backend && node scripts/backfillPinFields.js`
Expected: same `524 pins` line, and re-running the spot-check in Step 3 gives identical output (no drift).

- [ ] **Step 5: Commit**

```bash
cd backend && git add scripts/backfillPinFields.js
git commit -m "Backfill explicit category/interests/cuisines/diets from tags"
```

---

## Task 2.3: Backfill `ItineraryStop` rows from itinerary-attached pins

**Files:**
- Create: `backend/scripts/backfillItineraryStops.js`

**Interfaces:**
- Consumes: `MEAL_TAGS` from `services/recommendation/pinsRepository/classify.js`.
- Produces: an idempotent script that creates one `ItineraryStop` per itinerary-attached `Pin` (`itineraryId != null`), copying the per-visit fields and extracting any meal word from `tags` into `mealType`. Leaves the source `Pin` rows in place (Phase 5 removes them).

- [ ] **Step 1: Write the script**

```js
// backend/scripts/backfillItineraryStops.js
// One-off, idempotent: for each itinerary-attached Pin (itineraryId != null),
// create the equivalent ItineraryStop row. The stop points at the SAME Pin
// (pinId) — we do NOT dedupe venues here; the Pin row remains both the venue
// and (until Phase 5) the legacy stop. Per-visit fields (order, times, travel)
// copy across; a meal word baked into tags (breakfast/lunch/dinner) becomes the
// stop's mealType. Idempotent: we skip any (itineraryId, orderInItinerary) that
// already has a stop, so re-running inserts nothing.
import prisma from '../lib/prisma.js'
import { MEAL_TAGS } from '../services/recommendation/pinsRepository/classify.js'

const MEAL_SET = new Set(MEAL_TAGS)

async function main() {
  const attached = await prisma.pin.findMany({ where: { NOT: { itineraryId: null } } })

  const existing = await prisma.itineraryStop.findMany({
    select: { itineraryId: true, orderInItinerary: true },
  })
  const seen = new Set(existing.map((s) => `${s.itineraryId}|${s.orderInItinerary}`))

  const toCreate = []
  for (const pin of attached) {
    const key = `${pin.itineraryId}|${pin.orderInItinerary}`
    if (seen.has(key)) continue
    const mealType = (pin.tags ?? []).find((t) => MEAL_SET.has(t)) ?? null
    toCreate.push({
      pinId: pin.id,
      itineraryId: pin.itineraryId,
      orderInItinerary: pin.orderInItinerary,
      startTime: pin.startTime,
      endTime: pin.endTime,
      travelTimeToNextMinutes: pin.travelTimeToNextMinutes,
      distanceToNextMeters: pin.distanceToNextMeters,
      mealType,
      note: null,
    })
  }

  if (toCreate.length === 0) {
    console.log(`No new stops to create (${existing.length} already present).`)
    return
  }
  const result = await prisma.itineraryStop.createMany({ data: toCreate })
  console.log(`Created ${result.count} ItineraryStop rows (${existing.length} already present).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 2: Run it**

Run: `cd backend && node scripts/backfillItineraryStops.js`
Expected: `Created 125 ItineraryStop rows (0 already present).`

- [ ] **Step 3: Verify idempotency**

Run: `cd backend && node scripts/backfillItineraryStops.js`
Expected: `No new stops to create (125 already present).`

- [ ] **Step 4: Commit**

```bash
cd backend && git add scripts/backfillItineraryStops.js
git commit -m "Backfill ItineraryStop rows from itinerary-attached pins"
```

---

## Task 2.4: Reconciliation check

**Files:**
- Create: `backend/scripts/reconcilePinSplit.js`

**Interfaces:**
- Produces: a read-only verification script asserting the backfill is complete and correct. Exits 0 on success, 1 (with a printed reason) on any discrepancy.

- [ ] **Step 1: Write the script**

```js
// backend/scripts/reconcilePinSplit.js
// Read-only verification that Phase 2's backfill is complete and correct.
// Checks:
//   1. Every itinerary-attached Pin maps to exactly one ItineraryStop
//      (matched on itineraryId + orderInItinerary), and stop count == attached count.
//   2. Every ItineraryStop.pinId resolves to an existing Pin.
//   3. Per-itinerary stop order is preserved (the set of orders matches).
//   4. No Pin still carries the Phase-1 default of category='activity' while
//      having a food/cuisine tag (i.e. the field backfill actually ran).
import prisma from '../lib/prisma.js'

async function main() {
  const problems = []

  const attached = await prisma.pin.findMany({
    where: { NOT: { itineraryId: null } },
    select: { itineraryId: true, orderInItinerary: true },
  })
  const stops = await prisma.itineraryStop.findMany({
    select: { itineraryId: true, orderInItinerary: true, pinId: true },
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

  // 4. field backfill ran (no food-tagged pin left as default 'activity')
  const miscategorized = await prisma.pin.count({
    where: { category: 'activity', tags: { hasSome: ['food', 'mexican', 'chinese', 'italian', 'pizza', 'sushi'] } },
  })
  if (miscategorized > 0) {
    problems.push(`${miscategorized} food-tagged pins still categorized as 'activity' (field backfill incomplete)`)
  }

  if (problems.length > 0) {
    console.error('RECONCILIATION FAILED:')
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(`Reconciliation OK: ${stops.length} stops match ${attached.length} attached pins; all pinIds resolve; field backfill complete.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 2: Run it**

Run: `cd backend && node scripts/reconcilePinSplit.js; echo "exit: $?"`
Expected: `Reconciliation OK: 125 stops match 125 attached pins; all pinIds resolve; field backfill complete.` and `exit: 0`.

- [ ] **Step 3: Commit**

```bash
cd backend && git add scripts/reconcilePinSplit.js
git commit -m "Add Pin-split reconciliation check"
```

---

## Notes for later phases

- **Dedup deferred:** Phase 2 intentionally does NOT dedupe the 51 duplicate venue groups — every stop still points at its own original Pin. The design's "one venue row" goal is a Phase 3/5 concern (when reads switch to venue-only Pins and the old attached rows are dropped). Deduping now would orphan the legacy `Pin.itineraryId`/`orderInItinerary` columns that the app still reads. Left as-is on purpose.
- **`category` default:** Phase 1 set `@default("activity")`. After Task 2.2 every row has a derived value, but the column default stays until Phase 5 (harmless).

## Self-review notes

- **Spec coverage:** explicit-field backfill from tags (2.1 classifier + 2.2 script) ✓; ItineraryStop rows created from attached pins with mealType extraction (2.3) ✓; reconciliation with counts + pinId resolution + field-backfill check (2.4) ✓; idempotency on every script (2.2 Step 4, 2.3 Step 3) ✓; leave legacy columns intact for fallback (stated in each task) ✓.
- **Placeholder scan:** every step has full code + exact commands + expected output. No TODOs.
- **Type consistency:** `classifyTags` returns `{ category, interests, cuisines, diets }` (2.1) consumed verbatim by 2.2; `MEAL_TAGS` exported by 2.1 and consumed by 2.3; `ItineraryStop` field names (pinId, itineraryId, orderInItinerary, startTime, endTime, travelTimeToNextMinutes, distanceToNextMeters, mealType, note) match the Phase 1 schema and the 2.4 checks.
