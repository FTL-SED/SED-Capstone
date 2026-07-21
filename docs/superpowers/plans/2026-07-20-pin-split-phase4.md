# Pin Split Phase 4 Implementation Plan — Switch Itinerary Reads + Writes (together)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flip itinerary persistence to write `ItineraryStop` rows AND itinerary reads to reshape `ItineraryStop → Pin` back into the existing flat `pins[]` API shape — in lockstep, so there's never a window where reads and writes disagree. The frontend is not touched; its JSON contract is preserved byte-for-byte.

**Architecture:** Reads and writes switch together (that's why Phase 3 deferred itinerary reads here). A cutover backfill re-run first guarantees every existing itinerary has stops. Then: `persist.js` writes stops, `pinController`/`copyItinerary`/seeds write the new shape, and `models/itineraries.js` reads `stops → pin` and reshapes to `pins[]`. Legacy columns stay populated (dual-write is NOT done — see below) and are dropped only in Phase 5. Design: `docs/superpowers/specs/2026-07-20-pin-split-design.md`.

**Tech Stack:** Node ESM, Express, Prisma + PostgreSQL (Supabase), `node:test`.

## Global Constraints

- Backend is ESM (`"type": "module"`); `import`/`export`, `.js` extensions in import paths.
- All DB access through models / `lib/prisma.js` singleton; never `new PrismaClient()`.
- Never commit to `main`; branch `dylan-pin-split-phase4` off the merged `main` (Phase 3 = PR #59 must be merged first). No `Co-Authored-By` trailer.
- **Prerequisite:** PR #59 (Phase 3) merged to `main`. This plan builds on `mapVenue`, the explicit columns, and `ItineraryStop` all being on `main`.
- Test baseline entering Phase 4: whatever `main` shows after #59 merges (Phase 3 ended at 221). Re-confirm in Task 4.0.
- **The overriding contract: `GET /itineraries`, `GET /itineraries/:id`, and `POST /itineraries` responses stay structurally identical.** Frontend consumers read `pin.{name,latitude,longitude,startTime,endTime,pricePerPerson,address,locationImageUrl,tags,description,orderInItinerary}` and the meal badge from `tags` — the reshape must reproduce all of these.

## Critical facts (verified against the live codebase + DB, 2026-07-20)

- **The frontend does NOT use the `/pins` CRUD endpoints.** `rg` for `/pins` in `frontend/src` = zero hits. Itineraries are created only via the AI flow (`generateItinerary` → `POST /itineraries` with `pins` inline) and read via `GET /itineraries`. So Task 4.2 (pin→stop CRUD) has no frontend contract to preserve — only the endpoint's own shape. Lower risk than it looks.
- **Write paths that create pins today:** (1) `services/itinerary/persist.js` `stopsToPins` → `itineraries.create({ pins: { create }})`; (2) `controllers/itineraryController.js` `createItinerary` (inline `pins: { create: pinData }`) and `copyItinerary` (duplicates pins); (3) `controllers/pinController.js` `createPin`/`updatePin`/`deletePin`; (4) seed scripts.
- **Read paths:** `models/itineraries.js` `itineraryInclude` includes `pins`; `findById`/`findMany`/`create` all return via `withLikeCount`. `findByIdWithPins` (used by copy) includes `pins`.
- **DB state:** 28 itineraries, 125 legacy attached pins, 125 `ItineraryStop` rows; **0 itineraries currently missing stops** — but any itinerary created between now and cutover will have pins without stops (hence Task 4.1).
- Frontend pin-shape consumers to preserve: `ItineraryPage/WrittenItinerary` (reads name, startTime/endTime, address, description, pricePerPerson, and meal badge from `tags`), `ItineraryPage/MapView` (latitude/longitude/name), `ItineraryPage/PinDetailModal` (locationImageUrl, name, timing, cost, address).

## Design decision: single-write, not dual-write

Phase 4 switches writes to `ItineraryStop` and switches reads to stops in the **same PR**. We do NOT dual-write (write both legacy pins and stops). Reason: reads flip simultaneously, so nothing reads the legacy attached-pin columns after this phase — keeping them in sync would be dead effort. The legacy attached-pin rows created *before* Phase 4 remain (harmless, unread) until Phase 5 drops them. New itineraries after Phase 4 create ONLY `ItineraryStop` rows (+ their venue `Pin` reference).

**Consequence for venue pins:** an itinerary stop references a venue `Pin` by `pinId`. Today `persist.js` copies the shortlist pin's display fields into a new attached `Pin` row. In Phase 4, the shortlist pins ARE catalog venue pins (from `getAllPins`, `itineraryId = null`), so a stop just points at that existing catalog `pinId` — no new venue row created. (Copy/seed follow the same rule.)

---

## Task 4.0: Branch + cutover backfill re-run

**Files:** none (git + one script run)

- [ ] **Step 1: Branch off merged main**

```bash
cd /Users/ddrozario/codepath/SED-Capstone && git checkout main && git pull && git checkout -b dylan-pin-split-phase4
```
Expected: on `dylan-pin-split-phase4`, `backend/services/recommendation/pinsRepository/mapVenue.js` exists (confirms #59 merged). If it doesn't, STOP — #59 isn't merged.

- [ ] **Step 2: Re-run the idempotent stop backfill (catch gap-window itineraries)**

Run: `cd backend && node scripts/backfillItineraryStops.js`
Expected: `Created N ItineraryStop rows` where N = any itineraries created since the Phase 2 backfill (0 if none), then a re-run says "No new stops". This guarantees every existing itinerary has stops before reads flip.

- [ ] **Step 3: Confirm reconciliation + baseline**

Run: `cd backend && node scripts/reconcilePinSplit.js && npm test 2>&1 | grep -E "^ℹ (pass|fail)"`
Expected: reconciliation OK; `fail 0`. Record the pass count as the Phase 4 baseline.

---

## Task 4.1: Persist generated itineraries as `ItineraryStop` rows

**Files:**
- Modify: `backend/services/itinerary/persist.js`
- Modify: `backend/models/itineraries.js` (add a `createWithStops` path, or extend `create` to accept `stops`)
- Test: `backend/services/itinerary/persist.test.js` (update existing)

**Interfaces:**
- Consumes: the shortlist (catalog venue pins with real `id`), the feasible AI/fallback output (`stops[]` with `pinId`, `arriveTime`, `departTime`, `mealType?`, `note?`, travel fields).
- Produces: `stopsToStops(stops, shortlist, dayISO)` → `ItineraryStop.create[]` rows, each `pinId` = the shortlist pin's id (a catalog venue), with `orderInItinerary` = array index, `startTime`/`endTime` from the HH:MM + Pacific offset (reuse `toDateTime`/`pacificOffset`), `mealType`, `note`, travel fields. NO venue field copying (name/coords/etc. live on the referenced Pin).
- Produces: `persistItinerary` creates the `Itinerary` with `stops: { create: [...] }` instead of `pins: { create: [...] }`.

- [ ] **Step 1: Write the failing test**

Update `persist.test.js`: assert `stopsToStops` returns rows with `pinId` (from the shortlist), `orderInItinerary`, `startTime`/`endTime` as Dates, `mealType`, and NO `name`/`latitude`/`pricePerPerson` (those aren't stop fields). Example:

```js
test('stopsToStops maps AI stops to ItineraryStop rows referencing catalog pins', () => {
  const shortlist = [{ id: 101, name: 'Ferry Building', latitude: 37.79, longitude: -122.39, pricePerPerson: 0 }]
  const aiStops = [{ pinId: 101, arriveTime: '10:00', departTime: '11:00', mealType: null, travelTimeToNextMinutes: 5, distanceToNextMeters: 200 }]
  const rows = stopsToStops(aiStops, shortlist, '2026-01-01')
  assert.equal(rows[0].pinId, 101)
  assert.equal(rows[0].orderInItinerary, 0)
  assert.ok(rows[0].startTime instanceof Date)
  assert.equal(rows[0].name, undefined) // venue fields NOT on the stop
})
```

- [ ] **Step 2-4: Implement `stopsToStops` + rewire `persistItinerary`; run tests green.**

Keep `toDateTime`/`pacificOffset` (still needed). Replace the pin-building map with a stop-building map. The itinerary's `location`/`title`/`description` handling is unchanged. `coverImageUrl` currently defaults to `pins[0].locationImageUrl`; now derive it from the first stop's venue: look up `shortlist` by the first stop's `pinId` and use that venue's `locationImageUrl`.

- [ ] **Step 5: Commit** — `git commit -m "Persist generated itineraries as ItineraryStop rows"`

---

## Task 4.2: Pin/stop CRUD endpoints operate on `ItineraryStop`

**Files:**
- Modify: `backend/controllers/pinController.js`
- Modify: `backend/routes/pinRoutes.js` (only if endpoint paths change — prefer keeping `/pins` paths to avoid churn)
- Modify: `backend/models/itineraryStops.js` (add `findByIdWithItinerary`, `create`, `update`, `remove` as needed)
- Test: any existing pinController tests (check `rg "createPin|pinController" backend --type js -g '*.test.js'`)

**Interfaces:**
- A stop create references an existing venue `pinId` + itinerary + order/times. Update/delete operate on `ItineraryStop` by id, with ownership checked via the stop's itinerary.

**Context:** The frontend doesn't call these, so there's no external contract — but keep the endpoints working and coherent (they're part of the API surface). Decide whether "create a pin" means "add a stop referencing an existing catalog venue" (likely) — a custom user-added place would need a venue `Pin` created first; keep that path if `createPin` currently supports arbitrary places, else scope to referencing existing venues.

- [ ] **Steps:** TDD each endpoint against `ItineraryStop`. If no tests exist for pinController (likely — routes/controllers aren't unit-tested per convention), add minimal coverage for the model functions and verify the app boots + a manual curl works. Commit.

> ⚠️ IMPLEMENTER NOTE: verify the test situation first (`rg "pinController|/pins" backend --type js -g '*.test.js'`). If the pin endpoints have no tests today, do NOT invent a heavy test harness — match the codebase convention (pure logic tested, Express layer not). Focus on the model wrapper + a boot/smoke check.

---

## Task 4.3: `copyItinerary` duplicates stops, not venues

**Files:**
- Modify: `backend/controllers/itineraryController.js` (`copyItinerary`, ~line 295)
- Modify: `backend/models/itineraries.js` (`findByIdWithPins` → a stops-aware variant, e.g. `findByIdWithStops`)

**Interfaces:**
- `copyItinerary` reads the source itinerary's `stops` (with their `pinId`), and creates a new itinerary whose `stops` reference the **same venue `pinId`s** (don't duplicate venue Pins), copying order/times/mealType/travel.

- [ ] **Step 1: Write the failing test** (or extend an itineraryController test if present; else a focused model-level test).
- [ ] **Steps 2-4:** Add `findByIdWithStops` (include `stops` ordered, no venue duplication needed since we copy `pinId`); rewrite the `copy.create` block to build `stops: { create: [...] }` from the source stops. Run green.
- [ ] **Step 5: Commit** — `git commit -m "Copy itinerary duplicates stops referencing the same venues"`

---

## Task 4.4: Itinerary reads reshape `ItineraryStop → Pin` into `pins[]`

**Files:**
- Modify: `backend/models/itineraries.js`
- Test: `backend/models/itineraries.test.js` (create)

**Interfaces:**
- `itineraryInclude` includes `stops` (ordered by `orderInItinerary asc`) with their `pin`, plus `_count.likes`, instead of `pins`.
- `reshapeItinerary(itinerary)` replaces `withLikeCount`: folds `_count.likes` → `likeCount` AND flattens each `stop + stop.pin` into the legacy flat pin object under the `pins` key. Reconstructs `tags` = `interests + cuisines + diets` (+ `mealType` appended) so the frontend meal badge + tag display keep working. Exposes `mealType` too.

- [ ] **Step 1: Write the failing test**

```js
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
  assert.equal(out.stops, undefined)
  const p = out.pins[0]
  assert.equal(p.name, 'Taqueria')
  assert.equal(p.orderInItinerary, 0)
  assert.equal(p.pricePerPerson, 14)
  assert.equal(p.travelTimeToNextMinutes, 10)
  assert.equal(p.mealType, 'lunch')
  assert.ok(p.tags.includes('mexican'))
  assert.ok(p.tags.includes('lunch'))
  assert.equal(p.description, 'grab tacos') // stop.note overrides pin.description (matches persist behavior)
})
```

- [ ] **Step 2: Run to verify fail** — `reshapeItinerary` not exported.

- [ ] **Step 3: Implement**

```js
const itineraryInclude = {
  creator: { select: { id: true, username: true } },
  stops: { orderBy: { orderInItinerary: 'asc' }, include: { pin: true } },
  _count: { select: { likes: true } },
}

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

Replace `withLikeCount` with `reshapeItinerary` in `create`, `findMany`, `findById`. Export `reshapeItinerary`.

- [ ] **Step 4: Run tests** — `fail 0`.
- [ ] **Step 5: Commit** — `git commit -m "Reshape itinerary reads from ItineraryStop+Pin into legacy pins[] shape"`

---

## Task 4.5: Seed scripts write the new shape

**Files:**
- Modify: `backend/prisma/seed.js` (demo itineraries create `stops` referencing seeded catalog venues)
- Verify: `backend/scripts/seedSfPlaces.js` already seeds catalog venue pins (`itineraryId = null`) — no change needed unless it set legacy per-visit fields.

- [ ] **Steps:** Update `seed.js` so each demo itinerary's stops reference existing catalog venue pins by id and create `ItineraryStop` rows. Run `npm run seed` (or the documented seed command) against a scratch/local DB if available; at minimum confirm it type-checks and the create shape matches the schema. Commit.

> ⚠️ Do NOT run destructive seeds against the shared Supabase DB. If no scratch DB is available, verify the code shape and defer the live seed run, noting it in the report.

---

## Task 4.6: End-to-end contract verification (the safety gate)

**Files:**
- Create: `backend/scripts/verifyPhase4Contract.js`

**Interfaces:** a script that fetches an itinerary via the model layer (`itineraries.findById`) for an existing seeded itinerary and asserts the returned object has the legacy `pins[]` shape (every field the frontend reads), sourced from stops.

- [ ] **Step 1: Write the script** — load a known itinerary id, print its `pins[]`, and assert each pin has `name`, `latitude`, `longitude`, `startTime`, `endTime`, `pricePerPerson`, `orderInItinerary`, and `tags` (array). Exit non-zero if any pin is missing a field.

- [ ] **Step 2: Run it** — `cd backend && node scripts/verifyPhase4Contract.js` → all itineraries produce well-formed `pins[]`. If a pin is missing fields, STOP — the reshape is wrong.

- [ ] **Step 3: Manual JSON diff (recommended)** — before opening the PR, hit `GET /itineraries/:id` on this branch and on `main` for the same id and diff the JSON. Confirm structural equality (ordering of pins, field names). Note any differences in the report.

- [ ] **Step 4: Commit** — `git commit -m "Add Phase 4 itinerary contract verification script"`

---

## Out of scope (Phase 5)

- **Dropping legacy columns** (`itineraryId`/`orderInItinerary`/`startTime`/`endTime`/travel fields/`tags` on `Pin`) + deleting the pre-Phase-4 legacy attached-pin rows.
- **⚠️ The activity-matching switch:** before/with dropping `tags`, the engine must match activities on `pin.interests` instead of `pin.tags` (`shareTag` in filters.js, `matchCount`/`memberLikes` in score.js). Recorded from the Phase 3 review — MUST be in the Phase 5 plan or all activity matching breaks when `tags` is dropped.

## Self-review notes

- **Spec coverage:** cutover backfill (4.0) ✓; persist writes stops (4.1) ✓; pin CRUD → stops (4.2, low-risk: no frontend consumer) ✓; copy duplicates stops not venues (4.3) ✓; reads reshape to pins[] (4.4) ✓; seeds (4.5) ✓; contract verification (4.6) ✓. Reads+writes land together (all in one PR) — no mismatch window.
- **Placeholder scan:** Tasks 4.1, 4.4 carry full code. 4.2, 4.3, 4.5 reference existing files/harnesses to adapt (flagged as adapt-existing, with explicit implementer notes on the test convention and the no-destructive-seed rule) rather than inventing code blind — because the exact current content of those functions must be read at implementation time and matched.
- **Type consistency:** `stopsToStops` output (pinId, orderInItinerary, startTime, endTime, mealType, note, travel fields) matches `ItineraryStop` schema + `reshapeItinerary`'s stop-field reads; `reshapeItinerary` consumes `_count.likes` + `stops[].pin` matching the new `itineraryInclude`.
- **Risk ordering:** 4.0 (backfill) de-risks 4.4 (reads) by guaranteeing stops exist; 4.1+4.4 are the coupled core; 4.6 is the gate before PR. The frontend-doesn't-use-/pins finding makes 4.2 much lower risk than the design assumed.
