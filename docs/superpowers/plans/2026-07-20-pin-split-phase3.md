# Pin Split Phase 3 Implementation Plan — Switch Reads

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the recommendation engine and itinerary reads to the new explicit columns + `ItineraryStop`/`hoursOpen`, using the already-written `mapVenue` mapper — deleting the dedup pass and privacy filter, using real per-day hours — while keeping the API response shape byte-for-byte identical so the frontend never changes.

**Architecture:** Reads flip from the legacy shape (derive from `tags`, approximate hours from `startTime`/`endTime`, dedup, privacy-filter) to the new shape (`mapVenue` reads explicit columns + `hoursOpen`). The itinerary read path joins `ItineraryStop → Pin` and reshapes back into the flat `pins[]` array the frontend expects. Writes still go to the legacy columns (Phase 4); the legacy columns are dropped only in Phase 5. Design: `docs/superpowers/specs/2026-07-20-pin-split-design.md`.

**Tech Stack:** Node ESM, Express, Prisma + PostgreSQL (Supabase), `node:test`.

## Global Constraints

- Backend is ESM (`"type": "module"`); `import`/`export`, `.js` extensions in import paths.
- All DB access through models / `lib/prisma.js` singleton; never `new PrismaClient()`.
- Never commit to `main`; work on branch `dylan-pin-split-phase3` (see Task 3.0). No `Co-Authored-By` trailer.
- Test baseline entering Phase 3: **232 tests green** (includes `mapVenue`'s 8 tests already committed on the prep branch).
- **The overriding contract: the JSON returned by `POST /recommendations`, `GET /itineraries`, and `GET /itineraries/:id` must be structurally unchanged.** The frontend is not touched. Any read-path change reshapes back to the existing shape.

## Prerequisite (already done, verify only)

`mapVenue` (`services/recommendation/pinsRepository/mapVenue.js`) already exists + is tested. It reads a venue Pin row → engine shape, funnelling `cuisines`/`diets` through `emptyToUndefined` (Issue 1) and deriving `openingHours` from each pin's own `hoursOpen` for the trip weekday (Issue 2): `[{open,close}]` (open), `null` (closed that day), or `undefined` (unknown). Column fidelity vs `mapPin` was verified live (0 mismatches / 500 pins).

## Key behavior changes this phase introduces (all intended)

1. **`null` opening hours = closed that day = hard drop.** Today `openingHours` is always an interval array; `isOpenInWindow`/`hasUsableHours` treat falsy as "unknown ⇒ keep". `mapVenue` can now emit `null` meaning *explicitly closed*. The filter must drop a `null`-hours pin, while still keeping an `undefined`-hours pin. This is the one genuinely new filter rule.
2. **Hours become permissive for the 59 attached public-itinerary pins** whose legacy approximation used a narrow scheduled window — now they read the (currently neutral 08:00–22:00) `hoursOpen`. Accepted: the narrow window was a bad proxy; real hours are a later data task.
3. **Dedup + privacy filter removed** from `getAllPins`. NOTE: catalog venues are `itineraryId = null` rows; there are still 38 name+coord duplicates among engine-catalog rows and 59 public-attached pins today. See Task 3.1 — we scope the catalog query to `itineraryId = null` (true catalog), which removes the privacy concern (no itinerary attached) AND the need for cross-itinerary dedup in one move.

---

## Task 3.0: Create the Phase 3 branch

**Files:** none (git only)

- [ ] **Step 1: Branch off the prep branch (which has mapVenue + all of Phase 2)**

Run:
```bash
cd /Users/ddrozario/codepath/SED-Capstone && git checkout dylan-pin-split-phase3-prep && git checkout -b dylan-pin-split-phase3
```
Expected: "Switched to a new branch 'dylan-pin-split-phase3'".

- [ ] **Step 2: Confirm baseline**

Run: `cd backend && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `pass 232`, `fail 0`.

---

## Task 3.1: `getAllPins` reads venue catalog via `mapVenue`

**Files:**
- Modify: `backend/services/recommendation/pinsRepository/pinsRepository.js`
- Modify: `backend/services/recommendation/index.js`
- Test: `backend/services/recommendation/pinsRepository/pinsRepository.test.js` (update existing)

**Interfaces:**
- Consumes: `mapVenue(pin, tripDate)` from `./mapVenue.js`.
- Produces: `getAllPins(tripDate)` — queries `Pin` where `itineraryId = null` (true catalog only), maps each via `mapVenue`. No `dedupePins`, no privacy `OR`. Returns the engine pin shape.
- Produces: `getRecommendations(trip, members)` passes `trip.tripDate` (default `'2026-01-01'` when absent) to `getAllPins`.

- [ ] **Step 1: Write the failing test**

Replace the `getAllPins`-related expectations in `pinsRepository.test.js`. Add a test asserting the query shape and mapping (mock `prisma.pin.findMany`):

```js
// in pinsRepository.test.js — add/adjust:
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('getAllPins queries catalog-only and maps via mapVenue', async (t) => {
  const rows = [
    { id: 1, name: 'Taqueria', category: 'restaurant', tags: ['food','mexican'], interests: [], cuisines: ['mexican'], diets: [], rating: 4.5, pricePerPerson: 14, latitude: 37.75, longitude: -122.41, address: 'SF', locationImageUrl: null,
      hoursOpen: { mon:'08:00-22:00', tue:'08:00-22:00', wed:'08:00-22:00', thu:'08:00-22:00', fri:'08:00-22:00', sat:'08:00-22:00', sun:'08:00-22:00' } },
  ]
  let capturedWhere
  const prismaMock = { pin: { findMany: async ({ where }) => { capturedWhere = where; return rows } } }
  const { makeGetAllPins } = await import('./pinsRepository.js')
  const getAllPins = makeGetAllPins(prismaMock)
  const result = await getAllPins('2026-01-01')

  // catalog-only: no privacy OR, no attached pins
  assert.deepEqual(capturedWhere, { itineraryId: null })
  assert.equal(result.length, 1)
  assert.equal(result[0].category, 'restaurant')
  assert.deepEqual(result[0].cuisine, ['mexican'])
  assert.equal(result[0].diet, undefined) // [] -> undefined
  assert.deepEqual(result[0].openingHours, [{ open: '08:00', close: '22:00' }])
})
```

> Note: this requires a small refactor to make the prisma client injectable for the test (`makeGetAllPins(prisma)` factory + a default `getAllPins` bound to the real singleton). If the existing test file already imports the real DB, follow its existing pattern instead and keep the assertion on the mapped output + catalog-only scoping.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && node --test services/recommendation/pinsRepository/pinsRepository.test.js`
Expected: FAIL (either `makeGetAllPins` undefined, or the old dedup/privacy behavior returns the wrong shape).

- [ ] **Step 3: Rewrite `pinsRepository.js`**

```js
// backend/services/recommendation/pinsRepository/pinsRepository.js
// Loads the seeded venue catalog (Pin rows with no parent itinerary) into the
// engine's pin shape via mapVenue. Catalog-only scoping (itineraryId = null)
// means: no private-draft pin can leak (nothing to leak — catalog pins have no
// itinerary), and no cross-itinerary duplicate can appear (a venue is one
// catalog row), so the old dedupePins + privacy-OR are both gone.
import prisma from '../../../lib/prisma.js'
import { mapVenue } from './mapVenue.js'

// Factory so tests can inject a prisma mock.
function makeGetAllPins(client) {
  return async function getAllPins(tripDate) {
    const pins = await client.pin.findMany({ where: { itineraryId: null } })
    return pins.map((pin) => mapVenue(pin, tripDate))
  }
}

const getAllPins = makeGetAllPins(prisma)

export { getAllPins, makeGetAllPins }
```

> Keep `mapVenue`/`emptyToUndefined` imports intact. Remove the now-dead `mapPin`, `dedupePins`, `toPacificHHMM`, and the tagVocab classification imports from this file IF nothing else imports them. Check first: `rg "mapPin|dedupePins|toPacificHHMM" backend --type js -g '!node_modules'`. If other code imports them, leave them exported until Phase 5; if not, delete them here (their tests move/adjust accordingly).

- [ ] **Step 4: Thread `tripDate` through `index.js`**

```js
// backend/services/recommendation/index.js
import { getAllPins } from './pinsRepository/pinsRepository.js'
import { recommend } from './recommend/recommend.js'

async function getRecommendations(trip, members) {
  // Per-day hours need the trip's calendar day; default to a fixed day when the
  // caller omits it (matches services/itinerary/persist.js's fallback).
  const tripDate = trip?.tripDate ?? '2026-01-01'
  const pins = await getAllPins(tripDate)
  return recommend(trip, members, pins)
}

export { getRecommendations }
```

- [ ] **Step 5: Run tests**

Run: `cd backend && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `fail 0`. Update any test that asserted the old dedup/privacy behavior (see Task 3.1b for the privacy regression test).

- [ ] **Step 6: Commit**

```bash
cd backend && git add services/recommendation/pinsRepository/pinsRepository.js services/recommendation/index.js services/recommendation/pinsRepository/pinsRepository.test.js
git commit -m "Read venue catalog via mapVenue; drop dedup and privacy filter"
```

---

## Task 3.1b: Adapt the "Hawk Hill" privacy regression test

**Files:**
- Modify: `backend/services/recommendation/index.test.js` (the DB-integration test with the Hawk Hill privacy assertion)

**Interfaces:** none new.

**Context:** The old privacy test asserted a pin on a private draft itinerary never surfaces. With catalog-only scoping (`itineraryId = null`), private-draft pins are structurally excluded — they have an `itineraryId`, so they're never in the catalog query. The test's *intent* (private data never leaks) still holds and should still be asserted, just via the new mechanism.

- [ ] **Step 1: Update the test's premise**

Find the Hawk Hill test. Change its assertion to: a pin that exists ONLY on an itinerary (any `itineraryId != null`, public or private) does not appear in `getRecommendations` output — because the catalog is `itineraryId = null` only. Keep a positive assertion that a genuine catalog pin (`itineraryId = null`) with matching interests DOES appear.

- [ ] **Step 2: Run it**

Run: `cd backend && node --test services/recommendation/index.test.js`
Expected: PASS (or skips cleanly if no DB — preserve the existing `dbReason` skip guard).

- [ ] **Step 3: Commit**

```bash
cd backend && git add services/recommendation/index.test.js
git commit -m "Update privacy regression test for catalog-only scoping"
```

---

## Task 3.2: Filter drops pins closed on the trip day (`null` hours)

**Files:**
- Modify: `backend/services/recommendation/helpers/helpers.js`
- Modify: `backend/services/recommendation/filters/filters.js`
- Test: `backend/services/recommendation/helpers/helpers.test.js`, `backend/services/recommendation/filters/filters.test.js`

**Interfaces:**
- Produces: `isClosedThisDay(pin)` in helpers — `true` iff `pin.openingHours === null` (explicitly closed). `undefined`/array are NOT closed.
- `hardFilter` drops a pin when `isClosedThisDay(pin)` is true (a real hard drop, no flag — it's known-closed, not unknown).

- [ ] **Step 1: Write failing helper tests**

```js
// helpers.test.js — add:
import { isClosedThisDay } from './helpers.js'

test('isClosedThisDay: null openingHours means closed', () => {
  assert.equal(isClosedThisDay({ openingHours: null }), true)
})
test('isClosedThisDay: undefined openingHours is NOT closed (unknown)', () => {
  assert.equal(isClosedThisDay({ openingHours: undefined }), false)
  assert.equal(isClosedThisDay({}), false)
})
test('isClosedThisDay: an interval array is NOT closed', () => {
  assert.equal(isClosedThisDay({ openingHours: [{ open: '09:00', close: '17:00' }] }), false)
})
```

Also confirm the existing `isOpenInWindow`/`hasUsableHours` tests still pass — they take `undefined`/array only; add one guarding that `hasUsableHours({ openingHours: null })` is `false` (null has no usable intervals) so a closed pin isn't mistaken for "has hours".

- [ ] **Step 2: Run to verify fail**

Run: `cd backend && node --test services/recommendation/helpers/helpers.test.js`
Expected: FAIL — `isClosedThisDay` not exported.

- [ ] **Step 3: Add `isClosedThisDay` to helpers.js**

```js
// Explicitly closed on the trip day: mapVenue emits openingHours === null when
// the pin's hoursOpen marks that weekday closed. Distinct from `undefined`
// (unknown hours ⇒ keep) — a known-closed pin is a real hard drop.
function isClosedThisDay(pin) {
  return pin.openingHours === null
}
```

Add `isClosedThisDay` to the `export {}` block. Verify `hasUsableHours`/`isOpenInWindow` already handle `null` safely: `!pin.openingHours` is `true` for `null`, so `hasUsableHours` returns `false` and `isOpenInWindow` returns `true` — meaning without the new drop, a closed pin would be wrongly kept-and-flagged-unknown. The new drop in filters (next) is what fixes that.

- [ ] **Step 4: Add the drop to filters.js**

In `hardFilter`, before the existing hours check (around line 78), add:

```js
    // Known-closed on the trip day (mapVenue emitted null): a real hard drop,
    // no flag. Distinct from unknown hours (undefined), handled below.
    if (isClosedThisDay(pin)) continue
```

Import `isClosedThisDay` from helpers at the top of filters.js (add to the existing destructured import).

- [ ] **Step 5: Write a filters test for the drop**

```js
// filters.test.js — add a pin with openingHours: null and assert it's dropped
// (not in candidates, not in flags.hoursUnknown), while a pin with
// openingHours: undefined is kept and flagged hoursUnknown.
```
Use the file's existing `hardFilter` test harness/fixtures; add the two pins and assert accordingly.

- [ ] **Step 6: Run tests**

Run: `cd backend && node --test services/recommendation/helpers/helpers.test.js services/recommendation/filters/filters.test.js`
Expected: PASS.

- [ ] **Step 7: Full suite + commit**

Run: `cd backend && npm test 2>&1 | grep -E "^ℹ (pass|fail)"` → `fail 0`.
```bash
cd backend && git add services/recommendation/helpers/helpers.js services/recommendation/filters/filters.js services/recommendation/helpers/helpers.test.js services/recommendation/filters/filters.test.js
git commit -m "Drop pins explicitly closed on the trip day"
```

---

## Task 3.3: Itinerary reads join `ItineraryStop → Pin`, reshape to `pins[]`

**Files:**
- Modify: `backend/models/itineraries.js`
- Test: `backend/models/itineraries.test.js` (create if absent)

**Interfaces:**
- Produces: `itineraryInclude` includes `stops` (ordered by `orderInItinerary asc`) with their `pin`, instead of `pins`.
- Produces: a `reshapeItinerary(itinerary)` mapper that flattens each `stop + stop.pin` into the SAME object shape the old `pins[]` had, exposed under the `pins` key, so API responses are unchanged. Also exposes `mealType` as a field.

- [ ] **Step 1: Write the failing test**

```js
// backend/models/itineraries.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reshapeItinerary } from './itineraries.js'

test('reshapeItinerary flattens stops+pin into the legacy pins[] shape', () => {
  const row = {
    id: 7, title: 'Day', location: 'SF', _count: { likes: 2 },
    stops: [
      { orderInItinerary: 0, startTime: new Date('2026-01-01T17:00:00Z'), endTime: new Date('2026-01-01T18:00:00Z'),
        travelTimeToNextMinutes: 10, distanceToNextMeters: 500, mealType: 'lunch', note: 'grab tacos',
        pin: { id: 3, name: 'Taqueria', description: 'tacos', tags: ['food','mexican'], interests: [], cuisines: ['mexican'], diets: [],
               rating: 4.5, pricePerPerson: 14, latitude: 37.75, longitude: -122.41, address: 'SF', locationImageUrl: null } },
    ],
  }
  const out = reshapeItinerary(row)
  assert.equal(out.likeCount, 2)
  assert.ok(Array.isArray(out.pins))
  assert.equal(out.stops, undefined) // stops folded away
  const p = out.pins[0]
  assert.equal(p.name, 'Taqueria')          // venue field
  assert.equal(p.orderInItinerary, 0)       // stop field
  assert.equal(p.pricePerPerson, 14)        // venue field
  assert.equal(p.travelTimeToNextMinutes, 10) // stop field
  assert.equal(p.mealType, 'lunch')         // exposed
  // tags reconstructed so the frontend meal badge + tag display keep working:
  // interests+cuisines+diets (+ mealType appended)
  assert.ok(p.tags.includes('mexican'))
  assert.ok(p.tags.includes('lunch'))
  assert.equal(p.description, 'grab tacos') // stop.note overrides pin.description (matches persist.js today)
})
```

- [ ] **Step 2: Run to verify fail**

Run: `cd backend && node --test models/itineraries.test.js`
Expected: FAIL — `reshapeItinerary` not exported.

- [ ] **Step 3: Implement the reshape in `itineraries.js`**

Change `itineraryInclude` to include `stops` (ordered) with `pin`, plus keep `_count.likes` (from the earlier likeCount work). Add `reshapeItinerary`:

```js
// Flatten each ItineraryStop + its Pin back into the flat pin object the API
// has always returned, so the frontend is unaffected by the venue/stop split.
// tags is reconstructed from the explicit fields (+ mealType) for the meal badge.
function reshapeItinerary(itinerary) {
  if (!itinerary) return itinerary
  const { _count, stops, ...rest } = itinerary
  const pins = (stops ?? []).map((s) => {
    const p = s.pin
    const tags = [...(p.interests ?? []), ...(p.cuisines ?? []), ...(p.diets ?? [])]
    if (s.mealType) tags.push(s.mealType)
    return {
      id: p.id,
      name: p.name,
      description: s.note ?? p.description ?? null,
      tags,
      rating: p.rating,
      pricePerPerson: p.pricePerPerson,
      latitude: p.latitude,
      longitude: p.longitude,
      address: p.address,
      locationImageUrl: p.locationImageUrl,
      orderInItinerary: s.orderInItinerary,
      startTime: s.startTime,
      endTime: s.endTime,
      travelTimeToNextMinutes: s.travelTimeToNextMinutes,
      distanceToNextMeters: s.distanceToNextMeters,
      mealType: s.mealType ?? null,
    }
  })
  return { ...rest, likeCount: _count?.likes ?? 0, pins }
}
```

Wire `reshapeItinerary` into the read functions (`findById`, `findMany`, `create` return values) in place of the current `withLikeCount`, or compose them. **Important:** during Phase 3, writes still create legacy `Pin` rows (Phase 4 switches writes), so an itinerary created now has `pins` (legacy) but no `stops`. The reshape must not break for itineraries that still have legacy pins.

> ⚠️ DECISION POINT for the implementer: itineraries created before Phase 4 have legacy `Pin` rows (via `itineraryId`), NOT `ItineraryStop` rows — Phase 2 backfilled stops for EXISTING itineraries, but any itinerary created between Phase 2 and Phase 4 will have only legacy pins. Options: (a) include BOTH `pins` and `stops` in `itineraryInclude` and prefer `stops` when present, else fall back to legacy `pins`; (b) defer Task 3.3 until Phase 4 switches writes. **Recommend (a)** — it keeps reads correct through the transition. Implement the reshape to use `stops` if non-empty, else pass through the legacy `pins` unchanged.

- [ ] **Step 4: Run tests**

Run: `cd backend && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: `fail 0`.

- [ ] **Step 5: Commit**

```bash
cd backend && git add models/itineraries.js models/itineraries.test.js
git commit -m "Reshape itinerary reads from ItineraryStop+Pin into legacy pins[] shape"
```

---

## Task 3.4: End-to-end behavior-parity check

**Files:**
- Create: `backend/scripts/verifyPhase3Parity.js`

**Interfaces:** none new — a manual verification script.

- [ ] **Step 1: Write the script**

A script that runs `getRecommendations` for a representative trip/members set and prints the shortlist size, category mix, and any `hoursUnknown`/dropped counts — so a human can eyeball that the switch didn't wreck recommendations. Reuse the canned scenarios from `scripts/recommendationQualityReport.js` if present (check: `ls backend/scripts`).

```js
// backend/scripts/verifyPhase3Parity.js
import { getRecommendations } from '../services/recommendation/index.js'

const trip = { startTime: '09:00', endTime: '21:00', maxBudgetPerPerson: 80, groupSize: 3, travelRadius: 5, tripDate: '2026-01-01' }
const members = [
  { name: 'A', startLocation: { latitude: 37.7749, longitude: -122.4194 }, interestTags: ['museum', 'food'], foodPrefs: ['mexican'] },
  { name: 'B', startLocation: { latitude: 37.7849, longitude: -122.4094 }, interestTags: ['nature', 'scenic_views'], foodPrefs: ['italian'] },
  { name: 'C', startLocation: { latitude: 37.7649, longitude: -122.4294 }, interestTags: ['coffee'], foodPrefs: [] },
]

async function main() {
  const { shortlist, constraints } = await getRecommendations(trip, members)
  const byCat = shortlist.reduce((m, p) => ((m[p.category] = (m[p.category] || 0) + 1), m), {})
  console.log('shortlist size:', shortlist.length)
  console.log('category mix:', byCat)
  console.log('meetingPoint:', constraints.meetingPoint)
  console.log('sample:', shortlist.slice(0, 5).map((p) => `${p.name} [${p.category}]`))
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
```

- [ ] **Step 2: Run it (before-baseline: run once on the prep branch / from a stash of the old code if you want a diff; at minimum confirm it produces a sane non-empty shortlist)**

Run: `cd backend && node scripts/verifyPhase3Parity.js`
Expected: non-empty shortlist, ≥3 categories represented, a real meeting point. If the shortlist is empty or all one category, STOP — the read-switch changed behavior; investigate before proceeding.

- [ ] **Step 3: Commit**

```bash
cd backend && git add scripts/verifyPhase3Parity.js
git commit -m "Add Phase 3 recommendation parity check script"
```

---

## Out of scope (later phases)

- **Writes** still create legacy `Pin` rows (Phase 4: `persist.js` → `ItineraryStop`, `pinController` stop CRUD, copy duplicates stops, seeds write the new shape). Task 3.3's dual-read (stops-else-legacy-pins) bridges the gap until then.
- **classify-on-write** for `createPin`/`updatePin` (so API-created pins get the explicit columns) lands in Phase 4.
- **Dropping legacy columns** (`itineraryId`/`orderInItinerary`/times/`tags` on Pin) is Phase 5.
- **Real per-day hours** data seeding is a separate data task; `mapVenue` already handles it when present.

## Self-review notes

- **Spec coverage:** engine reads via mapVenue + drop dedup/privacy (3.1) ✓; privacy intent preserved via catalog-only scoping (3.1b) ✓; null-hours = closed = drop (3.2) ✓; itinerary reads reshape stops+pin → pins[] with mealType, API-shape-identical (3.3) ✓; parity check (3.4) ✓; Issues 1 & 2 already fixed in mapVenue (prerequisite) ✓.
- **Placeholder scan:** Tasks 3.1, 3.2, 3.3 carry full code. Tasks 3.1b and parts of 3.2/3.3-tests reference "the existing harness/fixtures" — flagged as adapt-existing rather than invented code, because they modify existing test files whose fixtures must be reused, not duplicated.
- **Type consistency:** `mapVenue(pin, tripDate)` signature matches `getAllPins(tripDate)`'s call; `isClosedThisDay(pin)` checks `openingHours === null` matching mapVenue's null output; `reshapeItinerary` consumes `_count.likes` (from the likeCount work) + `stops[].pin`.
- **Landmine coverage:** Issue 1 (emptyToUndefined) done in mapVenue; Issue 2 (per-day hours) done in mapVenue; Issue 3a (dedup) resolved by catalog-only scoping in 3.1; Issue 3b (classify-on-write) explicitly deferred to Phase 4 with a bridging dual-read in 3.3.
