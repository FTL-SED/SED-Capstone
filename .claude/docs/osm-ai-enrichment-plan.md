# Plan: AI-enrich OSM venues (rating + tags)

Status: **spec only — not built, no AI calls or DB writes made.** Decision logged 2026-07-22.

## Problem

`osmVenues.generated.js` imported ~4,255 SF venues from OpenStreetMap. They landed with:

- `rating: null` (OSM has no ratings)
- coarse fallback tags — nearly everything mapped to `interests: ['entertainment']` / `['casual']`; cuisines/diets mostly `[]`

After seeding, the catalog is ~4,280 rating-null OSM rows vs ~399 curated (rated, well-tagged) places. The OSM rows dominate the recommendation candidate pool but carry almost no ranking signal (the engine scores on tag overlap + rating). Goal: give each OSM venue a real `rating` and meaningful `interests`/`cuisines`/`diets`/`category` via AI, so they rank sensibly.

## Scope

- **In:** the ~4,280 OSM venues (identified today by `rating IS NULL`; better via a `source` column — see Schema below).
- **Out:** the ~399 curated venues (already have real ratings + hand tags — don't touch).
- One-off batch job, run manually (like the existing `scripts/enrich/*` OSM pipeline). Not request-path.

## Accuracy caveat (decide per field)

- **Tags/category** = classification from name/address/coords → the model is inferring "Blue Bottle → coffee, casual", which is reasonable and low-risk.
- **Rating** = the model does NOT have real review data; an AI rating is a *plausible synthetic number*, not real signal. Options:
  1. Generate a synthetic rating (fine for a capstone demo; label it as such).
  2. Leave rating null, enrich tags only (honest; the engine already handles null rating).
  3. Generate a coarse rating band (e.g. 3.5–4.5) to avoid false precision.
  Recommend (2) or (3) unless a demo specifically needs every card to show stars.

## Constrain AI output to the existing vocab

`config/tagVocab.js` already defines the canonical sets the engine matches on:
- CATEGORIES: 2 (`restaurant`, `activity`)
- INTERESTS: 18 · CUISINES: 13 · DIETS: 7

The prompt MUST instruct the model to choose ONLY from these enumerated values (pass the lists in the system prompt), and the writer MUST drop any value not in the vocab (via `tagVocab`'s existing `normalizeTag`/lookup). Otherwise enrichment reintroduces free-text tags the engine can't match.

## Schema change (for idempotency — do first)

Today there's no way to tell an OSM row from a curated one except `rating IS NULL`, and no way to know a row was already enriched. Add:

```prisma
model Pin {
  // ...
  source      String?   // 'curated' | 'osm' | 'manual' — provenance
  enrichedAt  DateTime? // when AI enrichment last wrote this row; null = not enriched
}
```

- Backfill `source`: curated rows (rating not null, or matched against the curated data files) → `'curated'`; the rest → `'osm'`.
- The job selects `where: { source: 'osm', enrichedAt: null }` → fully resumable; a crash/re-run never re-pays for done rows.
- Additive, nullable → safe migration on the shared DB (same pattern as the constraints migration).

## The batch job (`scripts/enrich/aiEnrichVenues.mjs`)

1. Load target rows: `pins.findMany({ where: { source: 'osm', enrichedAt: null } })`.
2. **Batch** ~20 venues per AI call (name + address + coords + current category). ~4,280 / 20 ≈ **215 calls** (vs 4,280 one-at-a-time). Reuses `callAI` from `services/ai/generation/client.js`.
3. Prompt returns, per venue, a JSON object: `{ pinId, category, interests[], cuisines[], diets[], rating? }`, values constrained to the vocab.
4. **Validate** each result: pinId in the batch, tags ∈ vocab (drop unknowns), rating in 0–5 (if used). Skip/flag malformed entries rather than write garbage.
5. Write in a transaction per batch: `pin.update` with the enriched fields + `enrichedAt = now()`. Commit per batch so progress survives a mid-run failure.
6. Log per-batch progress + a final summary (enriched / skipped / failed). Idempotent: re-running only touches rows still `enrichedAt: null`.

## Cost / time estimate

- ~215 batched calls. At the gateway/OpenRouter latency + retry budget already configured (`AI_TIMEOUT_MS`, `AI_MAX_RETRIES`), realistically minutes, not hours.
- Token cost is dominated by output (tags for 20 venues/call). Bounded and modest, but real — worth confirming which model/key is used before the run.

## Wiring it back

- Enriched rows just become better catalog data — the recommendation engine picks them up automatically (it already reads `rating` + tags via `mapVenue`).
- The `services/recommendation/enrich/enrich.js` no-op seam is a *different* (per-request, lazy) enrichment idea; this batch job is the pragmatic alternative. Update that file's comment to point here.

## Decisions (2026-07-22)

1. **Model:** Claude — via the Salesforce AI gateway (`AI_KEY`, model `claude-sonnet-4-5-20250929`), which the client prefers over OpenRouter. (Earlier OpenRouter runs hit a 402 "needs credits"; the gateway avoids that.)
2. **Prune:** yes — remove the chain branches from `osmVenues.generated.js` (keep one representative per chain) so a future `seed:places` never re-adds the 288 branches deleted today. Makes the DB trim durable.
3. **Scoped pass first, THEN shared DB** — safer. A scoped read-only pass enriches ~20-30 venues and PRINTS the AI output without writing, to validate prompt quality + vocab adherence + cost before any schema migration or bulk write to the shared team DB.
4. **Rating:** still open — recommend a coarse band or leave-null over a fake precise number; confirm when we move past the scoped pass.

## Build order (agreed)

1. **Prune** `osmVenues.generated.js` chain branches (source-file change, no DB write). ← do now
2. **Scoped enrichment pass** — a dry-run script that enriches a small sample via the gateway and prints results (no DB write, no migration). ← do now, review output
3. (after review) schema migration + full batch run against shared DB.
