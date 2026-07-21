# Pin Split Phase 5 Implementation Plan — Drop Legacy Columns (finale)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the split by removing the legacy per-visit columns from `Pin` (`itineraryId`, `orderInItinerary`, `startTime`, `endTime`, `travelTimeToNextMinutes`, `distanceToNextMeters`) and the `tags` column, plus deleting the pre-Phase-4 legacy attached-pin rows — AFTER switching the engine's last `pin.tags` reads to `pin.interests`. `Pin` becomes a pure venue table.

**Architecture:** Unlike Phases 1–4 (behavior-preserving), Phase 5 is **destructive**. The order is safety-critical: (1) make code stop reading the doomed columns (`tags → interests` engine switch — the one behavioral risk); (2) **repoint every `ItineraryStop` from its attached pin to a catalog venue** (the deferred Phase-2 dedup — see the critical finding below); (3) delete the now-unreferenced legacy attached-`Pin` rows; (4) drop the columns via a hand-written migration. Nothing is deleted while referenced; nothing dropped while read. Design: `docs/superpowers/specs/2026-07-20-pin-split-design.md`.

> **⚠️ CRITICAL FINDING (verified on the live DB) that reshaped this plan:** all 125 `ItineraryStop` rows currently reference the 125 **attached** pins (`itineraryId != null`), NOT catalog venues — because Phase 2's `backfillItineraryStops` set `pinId = pin.id` (the attached pin itself), deferring dedup. So the attached pins are **NOT safe to delete** until every stop is repointed to a catalog venue. Of the 125 attached pins: **99 have an exact catalog twin** (name + coords 4dp) to repoint to; **26 have no twin** (mostly demo-seed places, plus a couple like "La Taqueria" whose demo coords differ slightly from the catalog entry) and need a catalog venue created first. **Decision (option i):** dedup by exact name+coords; create the 26 missing venues even if a couple are near-duplicates of existing catalog places — honest and safe; a few near-dupe demo venues are harmless.

**Tech Stack:** Node ESM, Express, Prisma + PostgreSQL (Supabase), `node:test`.

## Global Constraints

- Backend is ESM (`"type": "module"`); `import`/`export`, `.js` extensions.
- All DB access via models / `lib/prisma.js` singleton; never `new PrismaClient()`.
- Never commit to `main`; branch `dylan-pin-split-phase5` off merged `main` (Phases 1–4 = #57–#60 all merged). No `Co-Authored-By` trailer.
- **Destructive migration rule:** dropping columns with data cannot run via non-interactive `prisma migrate dev`. Hand-write the migration SQL and apply with `npx prisma migrate deploy` (as done for `remove_like_count`). **Back up / snapshot the DB first.**
- Test baseline entering Phase 5: whatever `main` shows after #60 (Phase 4 ended at 221). Re-confirm in Task 5.0.
- **Behavior contract:** recommendation output and the itinerary API shape must be unchanged AFTER the `tags → interests` switch (Task 5.1). The migration itself (5.5) changes storage only.
- **What the human must do (flagged in-task):** (a) take a `pg_dump` snapshot right before Task 5.4 — `! pg_dump "$DIRECT_URL" -Fc -f pin-split-phase5-backup.dump` (needs the DB password; only the human can run it); (b) greenlight the destructive run (5.4 delete + 5.5 migrate deploy hit the shared DB) and choose the timing; (c) tell the team to run `npx prisma migrate deploy && npx prisma generate` after the migration merges.

## Critical facts (verified against `main` after #60, 2026-07-20)

**The ONLY code that reads a doomed `Pin` column and would break:**
1. **Engine activity-matching reads `pin.tags`** at exactly 3 sites (the real risk):
   - `services/recommendation/score/score.js:24` — `shareTag(pin.tags, new Set(member.interestTags))` (memberLikes)
   - `services/recommendation/score/score.js:39` — `(pin.tags ?? []).filter((t) => groupTags.has(t)).length` (matchCount)
   - `services/recommendation/filters/filters.js:68` — `shareTag(pin.tags, groupTags)` (relevance hard filter)
2. **`mapVenue.js:32`** exposes `tags: pin.tags ?? []` into the engine pin shape.
3. **`scripts/seedSfPlaces.js`** SETS `itineraryId: null, orderInItinerary: 0, startTime, endTime` on catalog pins — must stop setting dropped columns.
4. **`scripts/backfillItineraryStops.js`** reads `pin.itineraryId/startTime/etc.` — but it's a one-off already-run backfill; it becomes obsolete (archive, don't fix).

**NOT affected (verified — these read `ItineraryStop`/stop objects, which KEEP order/times/travel):** `persist.js`, `models/itineraries.js` `reshapeItinerary`, `verifyPhase4Contract.js`, all AI services, `copyItinerary`, `pinController` (operates on stops).

**Key insight for the `tags → interests` switch:** `mapVenue` already maps `pin.interests → pin.interests` (via `emptyToUndefined`, so it's `[]`→`undefined`). But the engine matches on `pin.tags`, the SUPERSET (interests + cuisines + diets + food-indicators). For genuine **activity** pins, `interests === tags` minus food words, so switching is safe. For **restaurants**, activity tag-matching doesn't apply (they match on `cuisine`), so losing food words from the match set is correct. Net: activity matching should read `pin.interests`; the score's `matchCount` and `memberLikes` must use `interests` for the activity branch. Restaurants already use `cuisine`/`diet` (unaffected).

**DB state:** 28 itineraries, 125 legacy attached pins (`itineraryId != null`) that are now UNREAD (Phase 4 reads stops), 125 `ItineraryStop` rows, ~399 catalog venue pins (`itineraryId = null`).

---

## Task 5.0: Branch + safety baseline

**Files:** none (git + verification)

- [ ] **Step 1: Branch off merged main**

```bash
cd /Users/ddrozario/codepath/SED-Capstone && git checkout main && git pull && git checkout -b dylan-pin-split-phase5
```
Expected: `models/itineraries.js` contains `reshapeItinerary` (confirms #60 merged). If not, STOP.

- [ ] **Step 2: Baseline + capture a recommendation snapshot (for 5.1 parity)**

Run: `cd backend && npm test 2>&1 | grep -E "^ℹ (pass|fail)"` → record the pass count, `fail 0`.
Run: `node scripts/verifyPhase3Parity.js` → record the shortlist size + category mix. This is the BEFORE snapshot the `tags → interests` switch (5.1) must reproduce.

---

## Task 5.1: Switch engine activity-matching from `pin.tags` to `pin.interests`

**Files:**
- Modify: `backend/services/recommendation/score/score.js`
- Modify: `backend/services/recommendation/filters/filters.js`
- Test: `backend/services/recommendation/score/score.test.js`, `backend/services/recommendation/filters/filters.test.js`

**Interfaces:**
- `memberLikes(pin, member)` (score.js:~24): the activity branch uses `pin.interests` instead of `pin.tags`.
- `matchCount(pin, groupTags, groupFood)` (score.js:~39): counts overlap against `pin.interests`.
- `hardFilter` relevance check (filters.js:~68): activity relevance uses `pin.interests`.
- Fallback: since `mapVenue` sets `interests` via `emptyToUndefined` (so it can be `undefined`), the read must be `(pin.interests ?? [])` everywhere, matching the existing `(pin.tags ?? [])` guards.

- [ ] **Step 1: Read all three sites + their current tests.** Understand that `shareTag(pinTags, groupTagsSet)` takes an array; today it's passed `pin.tags`. It will be passed `pin.interests ?? []`.

- [ ] **Step 2: Write/adjust failing tests** asserting activity matching works off `interests`:
  - score.test.js: a pin with `interests: ['museum']` (and NO `tags`) is liked by a member with `interestTags: ['museum']`; `matchCount` counts `interests` overlap. A pin whose only overlap was a food word (now in `cuisine`, not `interests`) is NOT matched as an activity.
  - filters.test.js: an activity pin passes the relevance filter via `interests`; update fixtures that relied on `tags`.
  - IMPORTANT: existing fixtures use `tags: [...]` on pin objects. Update them to use `interests: [...]` (and `cuisine`/`diet` where relevant) so they reflect the mapVenue output shape. Restaurants matched via `cuisine` are unchanged.

- [ ] **Step 3: Verify fail** — `node --test services/recommendation/score/score.test.js services/recommendation/filters/filters.test.js`.

- [ ] **Step 4: Implement** — swap `pin.tags` → `pin.interests ?? []` at the 3 sites. Do NOT change the restaurant branches (they use `cuisine`/`diet`). Update comments.

- [ ] **Step 5: Full suite** — `npm test` → `fail 0`.

- [ ] **Step 6: Parity re-check** — `node scripts/verifyPhase3Parity.js`. Compare to the 5.0 snapshot: shortlist size + category mix should be materially the same (small differences are acceptable ONLY if explained by food-word tags no longer matching activities; a large drop or empty list means the switch is wrong — investigate). Record both snapshots in the report.

- [ ] **Step 7: Commit** — `git commit -m "Match activities on pin.interests instead of pin.tags"`

---

## Task 5.2: Stop exposing/consuming `pin.tags` in the venue mapper + seed

**Files:**
- Modify: `backend/services/recommendation/pinsRepository/mapVenue.js`
- Modify: `backend/services/recommendation/pinsRepository/mapVenue.test.js`
- Modify: `backend/scripts/seedSfPlaces.js`
- Modify: `backend/prisma/data/sfPlaces/*` only IF the loader needs the split fields (see below)

**Interfaces:**
- `mapVenue` no longer sets `tags: pin.tags`. It should expose the split fields the engine now uses (`interests`, `cuisine`, `diet`) — already present. Remove the `tags` line (or, if any consumer still needs a combined tag list, build it from `interests+cuisines+diets` — but per 5.1 the engine no longer needs `tags`, so prefer removing it).
- `seedSfPlaces.js` stops setting `itineraryId`, `orderInItinerary`, `startTime`, `endTime` (dropped columns) and instead sets `category`/`interests`/`cuisines`/`diets` (+ `hoursOpen`) directly, classifying from the dataset's tags via `classifyTags` (the Phase 2 helper) so freshly-seeded catalog pins are correct without a separate backfill.

- [ ] **Step 1: mapVenue** — remove `tags: pin.tags ?? []`. Update the test to assert `tags` is no longer present (or is derived, per your choice) and that `interests`/`cuisine`/`diet` are exposed. Confirm no engine code reads `pin.tags` anymore: `rg "pin\.tags" backend/services --type js -g '!*.test.js'` → empty.

- [ ] **Step 2: seedSfPlaces** — import `classifyTags`; for each dataset place, set `{ category, interests, cuisines, diets } = classifyTags(place.tags)`, keep `hoursOpen` (neutral or real), and DROP `itineraryId`/`orderInItinerary`/`startTime`/`endTime` from the created row (they no longer exist post-migration; but this task runs BEFORE the migration, so to keep it runnable in both states, set them conditionally — SIMPLEST: since the migration is next and seedSfPlaces is only re-run after, just remove those fields now and note the seed must be run post-migration). The dataset files (`sfPlaces/*`) still carry `tags` for classification input — that's fine, `tags` in the dataset is source data, not a DB column.

- [ ] **Step 3: Verify** — `node --check scripts/seedSfPlaces.js`; `npm test` green; `rg "pin\.tags" backend/services --type js -g '!*.test.js'` empty.

- [ ] **Step 4: Commit** — `git commit -m "Stop exposing pin.tags in mapVenue; seed classifies split fields"`

---

## Task 5.3: Repoint every ItineraryStop from its attached pin to a catalog venue

**Files:**
- Create: `backend/scripts/repointStopsToVenues.js`

**Interfaces:**
- A one-off, idempotent script that (a) creates a catalog venue `Pin` (`itineraryId = null`) for each attached pin lacking an exact name+coords twin, then (b) updates every `ItineraryStop.pinId` from its attached pin to the matching catalog venue. After it runs, **0 stops reference an attached pin**.

**Context (the critical finding):** All 125 stops currently point at the 125 attached pins (Phase 2 set `pinId = pin.id`). Deleting the attached pins (Task 5.4) or dropping `itineraryId` (5.5) would orphan every stop. This task performs the deferred venue dedup so stops reference shared catalog venues instead. 99 attached pins have an exact catalog twin (name + coords 4dp); 26 do not and get a venue created (option i — accept the few near-dupes).

- [ ] **Step 1: Write the script.** Logic:
  1. Load all attached pins (`itineraryId != null`) and all catalog pins (`itineraryId = null`).
  2. Build a `key = name|lat.toFixed(4)|lng.toFixed(4)` → catalogPinId map.
  3. For each attached pin with **no** catalog key: create a catalog `Pin` (`itineraryId: null`, `orderInItinerary: 0`) copying its venue fields — name, description, latitude, longitude, address, pricePerPerson, rating, locationImageUrl, hoursOpen — and the split tag fields (`category`/`interests`/`cuisines`/`diets`) via `classifyTags(attachedPin.tags)` (Phase 2 helper). Add the new venue to the key map. Dedupe within this batch so two attached pins with the same key create ONE venue.
  4. For each `ItineraryStop`: look up its current pin's key, find the catalog venue id, and `update({ where: { id: stop.id }, data: { pinId: catalogVenueId } })` — but only if it currently differs (idempotent).
  5. Print: venues created, stops repointed.

- [ ] **Step 2: Run it.** `cd backend && node scripts/repointStopsToVenues.js` → e.g. "Created 26 catalog venues; repointed 125 stops."

- [ ] **Step 3: Verify (the linchpin check).** Run:
```bash
cd backend && node -e "import('./lib/prisma.js').then(async ({default:p}) => {
  const stops = await p.itineraryStop.findMany({ include: { pin: { select: { itineraryId: true } } } });
  const attachedRefs = stops.filter(s => s.pin.itineraryId !== null).length;
  console.log('stops still referencing an attached pin:', attachedRefs, '(must be 0)');
  process.exit(attachedRefs === 0 ? 0 : 1);
})"
```
Expected: `stops still referencing an attached pin: 0`, exit 0. **If not 0, STOP — 5.4 must not run.**

- [ ] **Step 4: Confirm reads still intact** — `node scripts/verifyPhase4Contract.js` (28 itineraries / 125 pins well-formed — now sourced from catalog venues) and `npm test` green.

- [ ] **Step 5: Commit** — `git commit -m "Repoint itinerary stops from attached pins to catalog venues"`

---

## Task 5.4: Delete leftover legacy attached-pin rows (data cleanup)

**Files:**
- Create: `backend/scripts/deleteLegacyAttachedPins.js`

**Interfaces:**
- A one-off script deleting `Pin` rows where `itineraryId IS NOT NULL` (the 125 legacy attached pins, now unreferenced after Task 5.3). Catalog pins (`itineraryId = null`) are kept. Prints the count deleted.

**Context:** These rows must go BEFORE the migration drops `itineraryId`. After Task 5.3 no stop references them, so deletion is safe.

- [ ] **Step 0 (HUMAN): take the snapshot.** Before running the delete: `! pg_dump "$DIRECT_URL" -Fc -f pin-split-phase5-backup.dump` (from the repo root, needs the DB password). Confirm the file exists before proceeding. This is the rollback for 5.4 + 5.5.

- [ ] **Step 1: Safety pre-check IN the script** — the script FIRST re-runs Task 5.3's linchpin check: count stops whose pin has `itineraryId != null`. If that count is **not 0**, ABORT with a clear message (do NOT delete — stops still reference attached pins). Only proceed to delete when 0.

- [ ] **Step 2: Write + run** — `node scripts/deleteLegacyAttachedPins.js` → "Deleted 125 legacy attached pins (N catalog pins retained)." Idempotent: a re-run deletes 0.

- [ ] **Step 3: Verify** — `pin.count({ where: { NOT: { itineraryId: null } } })` is 0; catalog count is ~399 + the 26 venues created in 5.3 (~425); `verifyPhase4Contract.js` still green (reads unaffected).

- [ ] **Step 4: Commit** — `git commit -m "Delete legacy attached-pin rows (superseded by ItineraryStop)"`

---

## Task 5.5: Drop the legacy columns (destructive migration)

**Files:**
- Modify: `backend/prisma/schema.prisma` (`Pin` model)
- Create: `backend/prisma/migrations/<ts>_drop_pin_legacy_columns/migration.sql` (hand-written)

**Interfaces:**
- `Pin` loses: `itineraryId`, `orderInItinerary`, `startTime`, `endTime`, `travelTimeToNextMinutes`, `distanceToNextMeters`, `tags`, the `itinerary` relation, and the `@@unique([itineraryId, orderInItinerary])` constraint. `Pin` keeps: id, name, description, category, interests, cuisines, diets, rating, pricePerPerson, latitude, longitude, address, locationImageUrl, hoursOpen, stops.
- `Itinerary` loses its `pins Pin[]` relation (keeps `stops`).

- [ ] **Step 1: Edit schema.prisma** — remove the listed fields/relation/constraint from `Pin`; remove `pins Pin[]` from `Itinerary`. Keep `stops ItineraryStop[]` on both `Pin` and `Itinerary`.

- [ ] **Step 2: Hand-write the migration SQL** (destructive → not via `migrate dev`):

```sql
-- Drop the unique constraint + FK first, then the columns.
ALTER TABLE "Pin" DROP CONSTRAINT IF EXISTS "Pin_itineraryId_orderInItinerary_key";
ALTER TABLE "Pin" DROP CONSTRAINT IF EXISTS "Pin_itineraryId_fkey";
ALTER TABLE "Pin" DROP COLUMN "itineraryId";
ALTER TABLE "Pin" DROP COLUMN "orderInItinerary";
ALTER TABLE "Pin" DROP COLUMN "startTime";
ALTER TABLE "Pin" DROP COLUMN "endTime";
ALTER TABLE "Pin" DROP COLUMN "travelTimeToNextMinutes";
ALTER TABLE "Pin" DROP COLUMN "distanceToNextMeters";
ALTER TABLE "Pin" DROP COLUMN "tags";
```

> Confirm the exact constraint/FK names first: `npx prisma migrate diff` or inspect the DB (`\d "Pin"`). Prisma's default names are `Pin_itineraryId_orderInItinerary_key` and `Pin_itineraryId_fkey`, but verify.

- [ ] **Step 3: Apply** — the snapshot was already taken in Task 5.4 Step 0; if 5.4 and 5.5 run in separate sessions, re-take it now. Then `npx prisma migrate deploy` and `npx prisma generate`. (HUMAN greenlight required — this hits the shared DB.)

- [ ] **Step 4: Verify** — `npx prisma validate`; `npx prisma migrate status` → up to date; `npm test` → `fail 0`; `node scripts/verifyPhase4Contract.js` → itineraries/pins still well-formed (proves itinerary reads survive the drop); `node scripts/verifyPhase3Parity.js` → recommendation shortlist still healthy.

- [ ] **Step 5: Commit** — `git commit -m "Drop legacy per-visit columns and tags from Pin"`

---

## Task 5.6: Cleanup + docs

**Files:**
- Archive/remove the one-off migration scripts, now obsolete: `backend/scripts/backfillItineraryStops.js`, `backfillPinFields.js`, `backfillHoursOpen.js`, `reconcilePinSplit.js`, `repointStopsToVenues.js`, `deleteLegacyAttachedPins.js`. Keep `verifyPhase4Contract.js` + `verifyPhase3Parity.js` as ongoing health checks if useful.
- Update: `.claude/docs/database-schema.md` (replace the "future shape" note with the real venue-only `Pin` + `ItineraryStop`), `planning/project_plan.md` data model, `.claude/schema-review-updated.md` (Issue 4 → DONE).
- Update: `backend/config/tagVocab.js` — the classification vocab is still used by `classifyTags` in the seed (5.2) and the repoint script (5.3), so KEEP it; just confirm no dead `tags`-column references remain.

- [ ] **Steps:** Remove/archive the obsolete scripts (confirm nothing imports them: `rg "backfillItineraryStops|backfillPinFields|reconcilePinSplit|repointStopsToVenues|deleteLegacyAttachedPins"`). Update the three docs to describe the final schema. Commit.

---

## Self-review notes

- **Spec coverage:** tags→interests engine switch (5.1 — the critical behavioral risk, parity-checked) ✓; stop exposing pin.tags + seed classifies (5.2) ✓; **repoint stops attached-pin→catalog-venue, the deferred dedup, with a 0-attached-refs linchpin check (5.3)** ✓; delete now-unreferenced attached rows behind a re-run guard + human snapshot (5.4) ✓; destructive column drop with post-migration verification (5.5) ✓; cleanup/docs (5.6) ✓.
- **Ordering is the safety property:** code stops reading doomed columns (5.1, 5.2) → stops repointed to catalog venues (5.3) → now-unreferenced attached rows deleted (5.4) → columns dropped (5.5). Never delete a row while referenced; never drop a column while read. 5.3's check (`0 stops → attached pins`) gates 5.4; 5.4's in-script re-check gates the delete; 5.5's verification runs BOTH the itinerary-contract and recommendation-parity scripts.
- **The corrected finding:** the original plan assumed attached pins were unreferenced and could be deleted directly — VERIFIED FALSE (all 125 stops reference them). Task 5.3 (repoint) is the fix and is the real substance of Phase 5; without it 5.4/5.5 would orphan every itinerary.
- **Human-in-the-loop:** snapshot (5.4 Step 0) + destructive-run greenlight (5.4/5.5) + team migrate-deploy notice are the human's; everything else is scripted + verified.
- **Placeholder scan:** 5.1 carries the exact 3 call-sites; 5.3 carries the full repoint logic + linchpin check; 5.5 carries the literal migration SQL (with a "verify constraint names first" caveat).
- **Type consistency:** `pin.interests ?? []` guard matches the existing `pin.tags ?? []` pattern; mapVenue already emits `interests` via emptyToUndefined; `classifyTags` (Phase 2) reused in the seed.
- **Rollback note:** 5.4 is the point of no return — the backup in Step 3 is the rollback. Everything before 5.4 is reversible (code changes on a branch, data delete in 5.3 is the one prior destructive step — its reconcile guard is the safety).
