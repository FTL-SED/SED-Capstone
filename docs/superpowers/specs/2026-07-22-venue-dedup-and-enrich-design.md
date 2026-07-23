# Design: Near-duplicate venue dedup + AI description/tag enrichment

Date: 2026-07-22
Status: approved (brainstorm), pending spec review

## Problem

The `Pin` catalog (4,391 venues: 399 curated + 3,992 OSM) has two issues after the OSM import + earlier AI tag/rating enrichment:

1. **Near-duplicate venues** — same `name`, slightly different `latitude`/`longitude`, but the same physical place. The earlier exact-dedup (name + coords at 4dp) missed these because coords differ beyond 4 decimals. Analysis of the live DB found **224 same-name groups with differing coords**, bimodally split: ~43 within 100m (clearly the same place — typically a curated pin and its bare OSM twin) vs 122 groups >1km (genuinely different chain branches, e.g. two KFCs 4km apart). Most ≤100m near-dups are a **curated + OSM pair**; the curated pin holds the description + clean tags, the OSM one has generic tags.
2. **Sparse descriptions + vocab-bound tags** — most OSM venues have `description: null`, and all tags are constrained to the current vocab (18 interests / 13 cuisines / 7 diets). Venues can legitimately be more than those categories; we want richer tags surfaced for review.

## Goals

- Remove near-duplicate venues (same place), keeping the richer record and never orphaning an itinerary stop.
- Generate a `description` for venues that lack one.
- Surface out-of-vocab tag ideas for the user to add to the canonical vocabulary — without silently drifting the taxonomy.

## Non-goals

- Live web scraping / external Places API (no scraping MCP available; a standalone batch script can't call the agent's WebFetch tool). Descriptions are AI-sourced.
- Auto-expanding the tag vocabulary (human-reviewed only).
- Touching curated data quality (curated pins already have good descriptions/tags).

## Architecture

Two standalone scripts under `backend/scripts/enrich/`, run in order, both **dry-run by default** with an `--apply` flag and an optional `--limit=N` for a scoped live pass. Both hit the shared Supabase DB, so both follow the established safety pattern: dry-run → small `--limit --apply` sanity pass → full `--apply` run.

**Run order matters:** dedup first, so we don't spend enrichment AI calls on venues about to be deleted.

### 1. `dedupeNearby.mjs` — collapse same-name-within-100m near-dups

- **Cluster:** group pins by `name.trim().toLowerCase()`; within each group, single-linkage cluster members whose pairwise haversine distance ≤ **100m**. Only clusters of 2+ act. (`utils/geo.js` already has `haversineMiles`; reuse it, convert 100m → miles.)
- **Survivor pick (keep-richest), in priority order:**
  1. a pin referenced by an `ItineraryStop` (guarantees no orphaned stop),
  2. `source === 'curated'`,
  3. has a non-null `description`,
  4. has a non-null `rating`,
  5. lowest `id` (deterministic tiebreak).
- **Re-point then delete (per cluster, in a transaction):** for each non-survivor, `prisma.itineraryStop.updateMany({ where: { pinId: loser }, data: { pinId: survivor } })`, then `prisma.pin.delete({ where: { id: loser } })`. This is required because `ItineraryStop.pinId` is a plain relation (Postgres RESTRICT, no cascade) — deleting a referenced pin would throw. The analysis found 8 near-dup pins referenced by 14 stops; re-pointing is defensive even though the survivor-pick already prefers the referenced pin.
- **Expected:** ~43 pins removed.
- **Output:** dry-run prints every cluster (name, members with id/source/distance, chosen survivor, losers). `--apply` executes and prints a summary.

### 2. `aiEnrichVenues.mjs` — extend the existing enrichment job

Already: batches ~20 venues/call via the AI gateway, classifies rating + interests/cuisines/diets/category constrained to vocab, idempotent via `source:'osm', enrichedAt:null`. Add:

- **Description generation.** The batch prompt additionally returns, per venue, `description` (string) + `descriptionConfidence` ("known" | "generic"):
  - `"known"` → the model recognizes the real SF venue → a specific 1–2 sentence description.
  - `"generic"` → not confident → a generic description templated from category/tags (e.g. "A local coffee spot in San Francisco.") — **never invents specific details** (no fake addresses, history, menus).
  - Written to `Pin.description` **only when currently null** (never overwrites a curated description).
- **Out-of-vocab tag collection.** The prompt may additionally propose richer tags in a separate `proposedTags` field (free-form, beyond the vocab). These are **NOT written to `Pin`** — only in-vocab tags are stored (so the recommendation engine can still match them). Proposed out-of-vocab tags are appended to a report file `backend/scripts/enrich/proposed-tags.md` as `tag → occurrence count → example venues`, for the user to review and add to `config/tagVocab.js`. After the user adds them, a re-run picks them up.

## Data flow

```
dedupeNearby.mjs  → DB: ~43 near-dup pins re-pointed + deleted (catalog 4391 → ~4348)
        ↓
aiEnrichVenues.mjs → DB: description filled (null rows only) + in-vocab tags/rating refreshed
                   → file: scripts/enrich/proposed-tags.md (out-of-vocab ideas for review)
                   → user adds chosen tags to config/tagVocab.js → optional re-run
```

## Error handling

- **Dedup:** per-cluster transaction — a failed re-point/delete rolls back that cluster only; the run continues and reports it. A post-plan safety assertion verifies every `ItineraryStop.pinId` still resolves to a surviving pin before any delete in `--apply`.
- **Enrichment:** per-batch try/catch (existing) — a failed AI call skips that batch (leaves those rows `enrichedAt:null` for a resumable re-run). Malformed AI output: validate each entry (id in batch, tags ∈ vocab, rating 0–5, description is a non-empty string); drop invalid fields rather than write garbage.

## Testing

Pure helpers get co-located `node:test` unit tests (no DB/AI):
- `clusterByProximity(pins, meters)` — grouping + single-linkage within threshold.
- `pickSurvivor(cluster, referencedIds)` — the 5-level priority.
- `filterToVocab(tags, vocab)` + `collectProposed(tags, vocab)` — in-vocab keep vs out-of-vocab collect.
- description validation (known vs generic shape).

Integration safety: dedup dry-run plan is printed and asserted (no stop left dangling); enrichment scoped `--limit` live pass before the full run. Both scripts are re-runnable and non-destructive without `--apply`.

## Rollout

1. Build + unit-test both scripts (no DB writes).
2. `dedupeNearby.mjs` dry-run → review plan → `--apply`.
3. `aiEnrichVenues.mjs` `--limit=40 --apply` scoped pass → review → full `--apply`.
4. Review `proposed-tags.md`; add chosen tags to `config/tagVocab.js`; optional enrichment re-run.

## Caveats (carried forward, documented in-script)

- AI ratings and "generic" descriptions are estimates, not real-world data.
- Dedup is name-exact + 100m; a genuinely-same place with a differently-spelled name is out of scope (rare, and fuzzy-name matching risks false merges).
