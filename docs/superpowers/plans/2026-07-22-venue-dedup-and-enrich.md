# Venue Dedup + Description/Tag Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove same-name near-duplicate venues (same physical place, coords within 100m), AI-generate descriptions for venues lacking one, and collect out-of-vocab tag proposals for the user to review.

**Architecture:** Two standalone Node ESM scripts under `backend/scripts/enrich/`, run in order (dedup first, then enrich). Pure logic (proximity clustering, survivor selection, vocab filtering, proposed-tag collection) is extracted into a tested helper module; the scripts orchestrate DB reads/writes and AI calls. Both are dry-run by default, take `--apply` to write and `--limit=N` to scope, and are idempotent/resumable.

**Tech Stack:** Node ESM, Prisma 6 (shared Supabase Postgres), `node:test`, the existing AI gateway client (`services/ai/generation/client.js` → `callAI`), `utils/geo.js` (`haversineMiles`, `milesToMeters`), `config/tagVocab.js`.

## Global Constraints

- All DB access via Prisma through `lib/prisma.js` (scripts may import it directly — they are not controllers/services).
- Shared DB: NEVER wipe/reset. Scripts are dry-run by default; only `--apply` writes. No new migrations in this plan (the `source`/`enrichedAt` columns already exist).
- `ItineraryStop.pinId` is a plain relation (Postgres RESTRICT, no cascade) — a referenced pin cannot be deleted until its stops are re-pointed.
- Tags written to `Pin` MUST be in-vocab (`config/tagVocab.js`); out-of-vocab tags are collected to a report, never stored.
- Tests: `node:test`, co-located `*.test.js`, run with `npm test` from `backend/`.
- Dedup threshold: **100m**. Descriptions: AI, "known" → specific / low-confidence → generic (never fabricated specifics), fill null only.

---

### Task 1: Pure dedup helpers (`clusterByProximity`, `pickSurvivor`)

**Files:**
- Create: `backend/scripts/enrich/dedupHelpers.js`
- Test: `backend/scripts/enrich/dedupHelpers.test.js`

**Interfaces:**
- Consumes: `haversineMiles`, `milesToMeters` from `../../utils/geo.js`.
- Produces:
  - `clusterByProximity(pins, meters)` → array of clusters (each an array of the input pin objects); pins grouped by `name.trim().toLowerCase()`, then single-linkage clustered so any two pins in a cluster are transitively within `meters`. Only clusters of length ≥ 2 are returned. Each pin object must carry at least `{ id, name, latitude, longitude }`.
  - `pickSurvivor(cluster, referencedIds)` → `{ survivor, losers }`, where `referencedIds` is a `Set<number>` of pin ids referenced by an ItineraryStop. Survivor priority: (1) referenced, (2) `source === 'curated'`, (3) non-null `description`, (4) non-null `rating`, (5) lowest `id`.

- [ ] **Step 1: Write the failing tests**

```js
// backend/scripts/enrich/dedupHelpers.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clusterByProximity, pickSurvivor } from './dedupHelpers.js'

const P = (id, name, lat, lon, extra = {}) => ({ id, name, latitude: lat, longitude: lon, ...extra })

test('clusterByProximity groups same-name pins within the threshold', () => {
  const pins = [
    P(1, 'Blue Bottle', 37.7770, -122.4230),
    P(2, 'Blue Bottle', 37.7771, -122.4231), // ~14m from #1 → same cluster
    P(3, 'Blue Bottle', 37.8000, -122.4500), // ~3km away → different place
    P(4, 'Ritual', 37.7560, -122.4210),      // singleton name
  ]
  const clusters = clusterByProximity(pins, 100)
  assert.equal(clusters.length, 1)
  assert.deepEqual(clusters[0].map((p) => p.id).sort(), [1, 2])
})

test('clusterByProximity is case-insensitive on name and ignores singletons', () => {
  const pins = [P(1, 'Cafe X', 37.77, -122.42), P(2, 'cafe x', 37.7701, -122.42)]
  const clusters = clusterByProximity(pins, 100)
  assert.equal(clusters.length, 1)
  assert.equal(clusters[0].length, 2)
})

test('clusterByProximity keeps far same-name pins in separate (non-)clusters', () => {
  const pins = [P(1, 'KFC', 37.70, -122.40), P(2, 'KFC', 37.79, -122.41)] // ~10km
  assert.equal(clusterByProximity(pins, 100).length, 0)
})

test('pickSurvivor prefers a referenced pin above all else', () => {
  const cluster = [
    P(1, 'X', 0, 0, { source: 'curated', description: 'nice', rating: 4.5 }),
    P(2, 'X', 0, 0, { source: 'osm', description: null, rating: null }),
  ]
  const { survivor, losers } = pickSurvivor(cluster, new Set([2]))
  assert.equal(survivor.id, 2)
  assert.deepEqual(losers.map((l) => l.id), [1])
})

test('pickSurvivor falls through curated > has-description > has-rating > lowest id', () => {
  const cluster = [
    P(3, 'X', 0, 0, { source: 'osm', description: null, rating: 4.1 }),
    P(1, 'X', 0, 0, { source: 'curated', description: null, rating: null }),
    P(2, 'X', 0, 0, { source: 'osm', description: 'has one', rating: null }),
  ]
  const { survivor } = pickSurvivor(cluster, new Set())
  assert.equal(survivor.id, 1) // curated wins
})

test('pickSurvivor tiebreaks on lowest id when all else equal', () => {
  const cluster = [
    P(9, 'X', 0, 0, { source: 'osm', description: null, rating: null }),
    P(4, 'X', 0, 0, { source: 'osm', description: null, rating: null }),
  ]
  assert.equal(pickSurvivor(cluster, new Set()).survivor.id, 4)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && node --test scripts/enrich/dedupHelpers.test.js`
Expected: FAIL — `Cannot find module './dedupHelpers.js'`.

- [ ] **Step 3: Implement the helpers**

```js
// backend/scripts/enrich/dedupHelpers.js
import { haversineMiles, milesToMeters } from '../../utils/geo.js'

// Group pins by normalized name, then single-linkage cluster within `meters`.
// Returns only clusters of 2+ (a same-name set that is one physical place).
export function clusterByProximity(pins, meters) {
  const byName = new Map()
  for (const p of pins) {
    const key = (p.name ?? '').trim().toLowerCase()
    if (!key) continue
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key).push(p)
  }

  const near = (a, b) => milesToMeters(haversineMiles(a, b)) <= meters
  const clusters = []
  for (const group of byName.values()) {
    if (group.length < 2) continue
    // Single-linkage: union pins that are within `meters` of any cluster member.
    const remaining = [...group]
    while (remaining.length) {
      const seed = remaining.shift()
      const cluster = [seed]
      let grew = true
      while (grew) {
        grew = false
        for (let i = remaining.length - 1; i >= 0; i--) {
          if (cluster.some((c) => near(c, remaining[i]))) {
            cluster.push(remaining.splice(i, 1)[0])
            grew = true
          }
        }
      }
      if (cluster.length >= 2) clusters.push(cluster)
    }
  }
  return clusters
}

// Choose which pin in a cluster to keep. Priority: referenced by a stop >
// curated source > has a description > has a rating > lowest id.
export function pickSurvivor(cluster, referencedIds) {
  const rank = (p) => [
    referencedIds.has(p.id) ? 0 : 1,
    p.source === 'curated' ? 0 : 1,
    p.description ? 0 : 1,
    p.rating != null ? 0 : 1,
    p.id,
  ]
  const sorted = [...cluster].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    for (let i = 0; i < ra.length; i++) {
      if (ra[i] !== rb[i]) return ra[i] - rb[i]
    }
    return 0
  })
  const [survivor, ...losers] = sorted
  return { survivor, losers }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && node --test scripts/enrich/dedupHelpers.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/enrich/dedupHelpers.js backend/scripts/enrich/dedupHelpers.test.js
git commit -m "Add dedup helpers: proximity clustering + survivor selection"
```

---

### Task 2: Dedup script (`dedupeNearby.mjs`)

**Files:**
- Create: `backend/scripts/enrich/dedupeNearby.mjs`

**Interfaces:**
- Consumes: `clusterByProximity`, `pickSurvivor` from `./dedupHelpers.js`; `prisma` from `../../lib/prisma.js`.
- Produces: an executable script. `node scripts/enrich/dedupeNearby.mjs` (dry run) prints the plan; `--apply` re-points stops onto survivors and deletes losers in a per-cluster transaction.

- [ ] **Step 1: Write the script**

```js
// backend/scripts/enrich/dedupeNearby.mjs
// Collapse same-name venues within 100m (the same physical place) to one row.
// Keeps the richest pin (see dedupHelpers.pickSurvivor), re-points any
// ItineraryStop from a loser onto the survivor (ItineraryStop.pinId is RESTRICT,
// so this must happen before delete), then deletes the losers.
//
// Usage (from backend/):
//   node scripts/enrich/dedupeNearby.mjs           # DRY RUN, prints the plan
//   node scripts/enrich/dedupeNearby.mjs --apply   # execute
import 'dotenv/config'
import prisma from '../../lib/prisma.js'
import { clusterByProximity, pickSurvivor } from './dedupHelpers.js'

const THRESHOLD_M = 100
const APPLY = process.argv.slice(2).includes('--apply')

async function main() {
  const pins = await prisma.pin.findMany({
    select: { id: true, name: true, latitude: true, longitude: true, source: true, description: true, rating: true },
  })
  const refRows = await prisma.$queryRawUnsafe(`SELECT DISTINCT "pinId" AS id FROM "ItineraryStop"`)
  const referencedIds = new Set(refRows.map((r) => r.id))

  const clusters = clusterByProximity(pins, THRESHOLD_M)
  const plan = clusters.map((c) => pickSurvivor(c, referencedIds))

  const loserTotal = plan.reduce((n, p) => n + p.losers.length, 0)
  console.log(`Clusters (same name, <=${THRESHOLD_M}m): ${clusters.length}  |  pins to remove: ${loserTotal}  |  mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`)
  for (const { survivor, losers } of plan) {
    console.log(`• ${survivor.name}: keep #${survivor.id} (${survivor.source}), remove ${losers.map((l) => `#${l.id}(${l.source})`).join(', ')}`)
  }

  // Safety: no survivor may itself be a loser of another cluster (disjoint by
  // construction — clusters partition a name group — but assert anyway).
  const survivorIds = new Set(plan.map((p) => p.survivor.id))
  const loserIds = plan.flatMap((p) => p.losers.map((l) => l.id))
  const conflict = loserIds.filter((id) => survivorIds.has(id))
  if (conflict.length) throw new Error(`survivor/loser conflict: ${conflict.join(',')}`)

  if (!APPLY) {
    console.log('\n[DRY RUN] Nothing changed. Re-run with --apply to execute.')
    await prisma.$disconnect()
    return
  }

  let removed = 0
  for (const { survivor, losers } of plan) {
    await prisma.$transaction([
      ...losers.map((l) =>
        prisma.itineraryStop.updateMany({ where: { pinId: l.id }, data: { pinId: survivor.id } })),
      ...losers.map((l) => prisma.pin.delete({ where: { id: l.id } })),
    ])
    removed += losers.length
  }

  // Verify: every stop still resolves to an existing pin.
  const dangling = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS n FROM "ItineraryStop" s LEFT JOIN "Pin" p ON p.id = s."pinId" WHERE p.id IS NULL`)
  const remaining = await prisma.pin.count()
  console.log(`\n[APPLIED] removed ${removed} pins. Catalog: ${remaining}. Dangling stops (must be 0): ${dangling[0].n}`)
  await prisma.$disconnect()
}

main().catch((err) => { console.error('dedupe failed:', err); process.exit(1) })
```

- [ ] **Step 2: Run the dry run**

Run: `cd backend && node scripts/enrich/dedupeNearby.mjs`
Expected: prints ~43 pins to remove across ~43 clusters, "DRY RUN" footer, no error. Confirm the survivor for each cluster is the curated/referenced pin where present.

- [ ] **Step 3: Commit the script (before applying)**

```bash
git add backend/scripts/enrich/dedupeNearby.mjs
git commit -m "Add near-duplicate venue dedup script (dry-run verified)"
```

- [ ] **Step 4: CHECKPOINT — apply to the shared DB**

Run: `cd backend && node scripts/enrich/dedupeNearby.mjs --apply`
Expected: "[APPLIED] removed ~43 pins. ... Dangling stops (must be 0): 0".
If dangling ≠ 0, STOP and investigate before proceeding.

---

### Task 3: Enrichment helper additions (description validation + proposed-tag collection)

**Files:**
- Create: `backend/scripts/enrich/enrichHelpers.js`
- Test: `backend/scripts/enrich/enrichHelpers.test.js`

**Interfaces:**
- Consumes: `INTERESTS`, `CUISINES`, `DIETS` from `../../config/tagVocab.js` (via the caller passing vocab arrays — keep the helper pure).
- Produces:
  - `filterToVocab(tags, allowed)` → array of only the `tags` present in `allowed`.
  - `collectProposed(tags, allowed)` → array of `tags` NOT in `allowed` (the out-of-vocab proposals).
  - `resolveDescription(aiDescription, confidence, venue)` → a string. If `confidence === 'known'` and `aiDescription` is a non-empty string, return it trimmed. Otherwise return a generic templated description: `` `A ${venue.category === 'restaurant' ? 'place to eat' : 'spot to visit'} in San Francisco.` ``.
  - `tallyProposed(existingMap, proposed, venueName)` → mutates/returns a `Map<tag, { count, examples: string[] }>` (examples capped at 3).

- [ ] **Step 1: Write the failing tests**

```js
// backend/scripts/enrich/enrichHelpers.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterToVocab, collectProposed, resolveDescription, tallyProposed } from './enrichHelpers.js'

const ALLOWED = ['coffee', 'food', 'art']

test('filterToVocab keeps only allowed tags', () => {
  assert.deepEqual(filterToVocab(['coffee', 'brewery', 'art'], ALLOWED), ['coffee', 'art'])
  assert.deepEqual(filterToVocab(undefined, ALLOWED), [])
})

test('collectProposed returns only out-of-vocab tags', () => {
  assert.deepEqual(collectProposed(['coffee', 'brewery', 'speakeasy'], ALLOWED), ['brewery', 'speakeasy'])
})

test('resolveDescription uses the AI text when confidence is known', () => {
  assert.equal(
    resolveDescription('  Historic ferry terminal turned food hall.  ', 'known', { category: 'activity' }),
    'Historic ferry terminal turned food hall.')
})

test('resolveDescription falls back to a generic, non-fabricated line otherwise', () => {
  assert.equal(resolveDescription('', 'generic', { category: 'restaurant' }), 'A place to eat in San Francisco.')
  assert.equal(resolveDescription('anything', 'lowconf', { category: 'activity' }), 'A spot to visit in San Francisco.')
})

test('tallyProposed counts occurrences and caps examples at 3', () => {
  const m = new Map()
  tallyProposed(m, ['brewery'], 'A'); tallyProposed(m, ['brewery'], 'B')
  tallyProposed(m, ['brewery'], 'C'); tallyProposed(m, ['brewery'], 'D')
  assert.equal(m.get('brewery').count, 4)
  assert.deepEqual(m.get('brewery').examples, ['A', 'B', 'C'])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && node --test scripts/enrich/enrichHelpers.test.js`
Expected: FAIL — `Cannot find module './enrichHelpers.js'`.

- [ ] **Step 3: Implement the helpers**

```js
// backend/scripts/enrich/enrichHelpers.js
export const filterToVocab = (tags, allowed) =>
  Array.isArray(tags) ? tags.filter((t) => allowed.includes(t)) : []

export const collectProposed = (tags, allowed) =>
  Array.isArray(tags) ? tags.filter((t) => !allowed.includes(t)) : []

export function resolveDescription(aiDescription, confidence, venue) {
  if (confidence === 'known' && typeof aiDescription === 'string' && aiDescription.trim()) {
    return aiDescription.trim()
  }
  const kind = venue.category === 'restaurant' ? 'place to eat' : 'spot to visit'
  return `A ${kind} in San Francisco.`
}

export function tallyProposed(map, proposed, venueName) {
  for (const tag of proposed ?? []) {
    if (!map.has(tag)) map.set(tag, { count: 0, examples: [] })
    const entry = map.get(tag)
    entry.count += 1
    if (entry.examples.length < 3) entry.examples.push(venueName)
  }
  return map
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && node --test scripts/enrich/enrichHelpers.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/enrich/enrichHelpers.js backend/scripts/enrich/enrichHelpers.test.js
git commit -m "Add enrich helpers: vocab filter, proposed-tag tally, description resolver"
```

---

### Task 4: Extend `aiEnrichVenues.mjs` with descriptions + proposed-tag report

**Files:**
- Modify: `backend/scripts/enrich/aiEnrichVenues.mjs`

**Interfaces:**
- Consumes: `filterToVocab`, `collectProposed`, `resolveDescription`, `tallyProposed` from `./enrichHelpers.js`; existing `callAI`, vocab, prisma.
- Produces: enrichment run that additionally writes `description` (null rows only) and appends `backend/scripts/enrich/proposed-tags.md`.

- [ ] **Step 1: Update the SYSTEM prompt** to also request `description`, `descriptionConfidence`, and `proposedTags`. Replace the prompt's output-shape line and add rules:

```js
// in the SYSTEM array, replace the final output-shape lines with:
  'Also return: "description" (1-2 sentences), "descriptionConfidence" ("known" if you recognize this exact real venue, else "generic"), and "proposedTags" (0-5 richer tags that describe the venue but may fall OUTSIDE the lists above — these are suggestions only).',
  'When descriptionConfidence is not "known", do NOT invent specific facts (no made-up history/address/menu) — a short generic line is fine.',
  'Output ONLY a JSON array, one object per venue, each exactly:',
  '{"id": <int>, "category": <string>, "interests": [], "cuisines": [], "diets": [], "rating": <number>, "description": <string>, "descriptionConfidence": "known"|"generic", "proposedTags": []}',
  'No prose, no markdown.',
```

- [ ] **Step 2: Import the helpers and a proposed-tags Map** at the top of the file:

```js
import fs from 'node:fs'
import { filterToVocab, collectProposed, resolveDescription, tallyProposed } from './enrichHelpers.js'
const proposedTally = new Map()
```

- [ ] **Step 3: In `enrichBatch`, build description + collect proposed tags.** In the loop over `result`, replace the `updates.push({...})` block's `data` with one that adds description and tallies proposals. Only set `description` when the venue's current description is null (fetch it in the target select — add `description: true`):

```js
    const proposed = collectProposed(
      [...(r.interests ?? []), ...(r.cuisines ?? []), ...(r.diets ?? [])],
      [...INTEREST_VALUES, ...CUISINE_VALUES, ...DIET_VALUES],
    )
    tallyProposed(proposedTally, proposed, byId.get(r.id).name)

    const data = {
      category,
      interests: filterToVocab(r.interests, INTEREST_VALUES),
      cuisines: filterToVocab(r.cuisines, CUISINE_VALUES),
      diets: filterToVocab(r.diets, DIET_VALUES),
      rating,
      enrichedAt: new Date(),
    }
    // Fill description only when the venue lacks one (never overwrite curated text).
    if (byId.get(r.id).description == null) {
      data.description = resolveDescription(r.description, r.descriptionConfidence, { category })
    }
    updates.push({ id: r.id, data })
```

(Also change the target `select` to include `description: true`, and swap the inline `only(...)` calls for `filterToVocab` — remove the old `only` const.)

- [ ] **Step 4: Write the proposed-tags report at the end of `main`** (after the summary, both dry-run and apply):

```js
  if (proposedTally.size) {
    const lines = [...proposedTally.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([tag, { count, examples }]) => `- \`${tag}\` — ${count}× (e.g. ${examples.join(', ')})`)
    const report = `# Proposed out-of-vocab tags\n\nAI-suggested tags NOT in config/tagVocab.js. Review and add the good ones, then re-run enrichment to store them.\n\n${lines.join('\n')}\n`
    fs.writeFileSync(new URL('./proposed-tags.md', import.meta.url), report)
    console.log(`\nWrote ${proposedTally.size} proposed tags to scripts/enrich/proposed-tags.md`)
  }
```

- [ ] **Step 5: Dry-run to verify the new fields + report**

Run: `cd backend && node scripts/enrich/aiEnrichVenues.mjs`
Expected: prints sample venues WITH a description line; creates/updates `scripts/enrich/proposed-tags.md` with out-of-vocab suggestions; "dry run — nothing written" footer.

- [ ] **Step 6: Commit**

```bash
git add backend/scripts/enrich/aiEnrichVenues.mjs backend/scripts/enrich/proposed-tags.md
git commit -m "Enrich venues with descriptions + collect out-of-vocab tag proposals"
```

---

### Task 5: Run enrichment against the shared DB + reset enrichedAt

**Files:** none (operational).

**Context:** all 3,992 OSM pins already have `enrichedAt` set from the prior run, so the description pass would skip them. We must clear `enrichedAt` (or clear it for description-null rows) so this run reprocesses them for descriptions. Descriptions only write where `description IS NULL`, so re-running is safe/idempotent for already-described rows.

- [ ] **Step 1: Reset enrichedAt for OSM rows that still lack a description**

Run (from backend/, throwaway inline):
```bash
node -e "import('./lib/prisma.js').then(async ({default:p})=>{const r=await p.pin.updateMany({where:{source:'osm',description:null},data:{enrichedAt:null}});console.log('reset',r.count);await p.\$disconnect()})"
```
Expected: prints the count of description-less OSM rows reset (roughly the full OSM set minus the ~2 that had descriptions).

- [ ] **Step 2: Scoped live pass**

Run: `cd backend && node scripts/enrich/aiEnrichVenues.mjs --limit=40 --apply`
Expected: "wrote 40" across 2 batches; spot-check a few rows have a `description` now.

- [ ] **Step 3: Full run**

Run: `cd backend && node scripts/enrich/aiEnrichVenues.mjs --apply`
Expected: enriches the remainder; "Remaining un-enriched OSM: 0" (re-run once if batches were skipped on transient errors).

- [ ] **Step 4: Verify + regenerate the final proposed-tags report**

Run (throwaway inline):
```bash
node -e "import('./lib/prisma.js').then(async ({default:p})=>{const n=await p.pin.count({where:{source:'osm',description:null}});console.log('osm rows still missing description (want 0):',n);await p.\$disconnect()})"
```
Expected: 0. Confirm `scripts/enrich/proposed-tags.md` reflects the full run.

- [ ] **Step 5: Commit the final report**

```bash
git add backend/scripts/enrich/proposed-tags.md
git commit -m "Add proposed out-of-vocab tag report from full enrichment run"
```

---

## Self-Review

**Spec coverage:**
- Dedup same-name ≤100m, keep-richest, re-point stops → Tasks 1, 2. ✓
- AI descriptions, known-vs-generic, fill-null-only → Tasks 3 (resolver), 4 (wiring), 5 (run). ✓
- Out-of-vocab tags collected to report, not stored → Tasks 3 (`collectProposed`/`tallyProposed`), 4 (report). ✓
- Dry-run-first + scoped pass safety → Tasks 2, 5. ✓
- Unit tests for pure helpers → Tasks 1, 3. ✓
- No new migration (columns exist) → confirmed in Global Constraints. ✓

**Placeholder scan:** No TBD/TODO; all steps carry real code/commands. ✓

**Type consistency:** `clusterByProximity(pins, meters)`, `pickSurvivor(cluster, referencedIds:Set)`, `filterToVocab(tags, allowed)`, `collectProposed(tags, allowed)`, `resolveDescription(aiDescription, confidence, venue)`, `tallyProposed(map, proposed, venueName)` — names/signatures consistent between definition (Tasks 1, 3) and use (Tasks 2, 4). ✓
