// Batch AI-enrichment of OSM-imported catalog venues.
//
// The OSM import (osmVenues.generated.js) landed ~4k venues with rating=null and
// coarse fallback tags. This job asks Claude (via the AI gateway) to classify
// each venue's rating + interests/cuisines/diets/category, constrained to the
// canonical vocab in config/tagVocab.js, and writes the result back.
//
// Idempotent + resumable: targets only `source:'osm', enrichedAt:null`, writes
// per batch, and stamps `enrichedAt`, so a re-run never re-pays for done rows.
//
// Usage (from backend/):
//   node scripts/enrich/aiEnrichVenues.mjs            # DRY RUN, first batch only
//   node scripts/enrich/aiEnrichVenues.mjs --limit=100 --apply
//   node scripts/enrich/aiEnrichVenues.mjs --apply    # full run
//
// Ratings are AI ESTIMATES (the model has no real reviews) — plausible for
// well-known places, a guess for obscure ones. Kept in a 3.5–4.7 band.
import 'dotenv/config'
import fs from 'node:fs'
import prisma from '../../lib/prisma.js'
import { callAI } from '../../services/ai/generation/client.js'
import { CUISINES, DIETS, INTERESTS, CATEGORIES } from '../../config/tagVocab.js'
import { filterToVocab, collectProposed, resolveDescription, tallyProposed } from './enrichHelpers.js'
const proposedTally = new Map()

const BATCH_SIZE = 20

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const limitArg = args.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : (APPLY ? Infinity : BATCH_SIZE)

const INTEREST_VALUES = Object.keys(INTERESTS)
const CUISINE_VALUES = Object.keys(CUISINES)
const DIET_VALUES = Object.keys(DIETS)
const CATEGORY_VALUES = Object.keys(CATEGORIES)

const SYSTEM = [
  'You classify San Francisco venues for a trip planner. For each venue given,',
  'output enrichment fields chosen ONLY from these allowed values:',
  `category: ${CATEGORY_VALUES.join(' | ')}`,
  `interests: ${INTEREST_VALUES.join(', ')}`,
  `cuisines (restaurants only): ${CUISINE_VALUES.join(', ')}`,
  `diets (only when clearly applicable): ${DIET_VALUES.join(', ')}`,
  'rating: a number 3.5-4.7, a plausible quality estimate (you do NOT have real reviews).',
  'Rules: pick 1-4 interests. Use ONLY values from the lists above (never invent tags).',
  'cuisines and diets are [] for non-food venues or when unknown.',
  'Also return: "description" (1-2 sentences), "descriptionConfidence" ("known" if you recognize this exact real venue, else "generic"), and "proposedTags" (0-5 richer tags that describe the venue but may fall OUTSIDE the lists above — these are suggestions only).',
  'When descriptionConfidence is not "known", do NOT invent specific facts (no made-up history/address/menu) — a short generic line is fine.',
  'Output ONLY a JSON array, one object per venue, each exactly:',
  '{"id": <int>, "category": <string>, "interests": [], "cuisines": [], "diets": [], "rating": <number>, "description": <string>, "descriptionConfidence": "known"|"generic", "proposedTags": []}',
  'No prose, no markdown.',
].join('\n')

async function enrichBatch(batch) {
  const user =
    'Venues:\n' +
    JSON.stringify(
      batch.map((v) => ({ id: v.id, name: v.name, address: v.address, category: v.category })),
      null,
      2,
    )
  const result = await callAI([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: user },
  ])
  if (!Array.isArray(result)) throw new Error('AI did not return a JSON array')

  const byId = new Map(batch.map((v) => [v.id, v]))
  const updates = []
  for (const r of result) {
    if (!byId.has(r.id)) continue // hallucinated id — skip
    const category = CATEGORY_VALUES.includes(r.category) ? r.category : byId.get(r.id).category
    const rating = typeof r.rating === 'number' ? Math.min(5, Math.max(0, r.rating)) : null

    const proposed = collectProposed(
      [...(r.interests ?? []), ...(r.cuisines ?? []), ...(r.diets ?? []), ...(r.proposedTags ?? [])],
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
  }
  return updates
}

async function main() {
  const targets = await prisma.pin.findMany({
    where: { source: 'osm', enrichedAt: null },
    select: { id: true, name: true, address: true, category: true, description: true },
    orderBy: { id: 'asc' },
    ...(Number.isFinite(LIMIT) ? { take: LIMIT } : {}),
  })
  console.log(`Targets: ${targets.length} (mode: ${APPLY ? 'APPLY' : 'DRY RUN'}, batch ${BATCH_SIZE})`)

  let enriched = 0
  let skipped = 0
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE)
    const n = `${i + 1}-${i + batch.length}`
    try {
      const updates = await enrichBatch(batch)
      skipped += batch.length - updates.length
      if (APPLY) {
        await prisma.$transaction(updates.map((u) => prisma.pin.update({ where: { id: u.id }, data: u.data })))
        enriched += updates.length
        console.log(`  [${n}] wrote ${updates.length}`)
      } else {
        // Dry run: show a couple of samples so the output is reviewable.
        for (const u of updates.slice(0, 3)) {
          const v = batch.find((b) => b.id === u.id)
          const descLine = u.data.description ? `\n    "${u.data.description}"` : ''
          console.log(`  ${v.name} → ${u.data.category} ★${u.data.rating} | ${u.data.interests.join(',')}${u.data.cuisines.length ? ' | ' + u.data.cuisines.join(',') : ''}${descLine}`)
        }
        enriched += updates.length
      }
    } catch (err) {
      console.error(`  [${n}] batch failed: ${err.message} — skipping`)
      skipped += batch.length
    }
  }

  const remaining = await prisma.pin.count({ where: { source: 'osm', enrichedAt: null } })
  console.log(`\n${APPLY ? 'Enriched' : 'Would enrich'} ${enriched}, skipped ${skipped}. Remaining un-enriched OSM: ${remaining}${APPLY ? '' : ' (dry run — nothing written)'}`)

  if (proposedTally.size) {
    const lines = [...proposedTally.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([tag, { count, examples }]) => `- \`${tag}\` — ${count}× (e.g. ${examples.join(', ')})`)
    const report = `# Proposed out-of-vocab tags\n\nAI-suggested tags NOT in config/tagVocab.js. Review and add the good ones, then re-run enrichment to store them.\n\n${lines.join('\n')}\n`
    fs.writeFileSync(new URL('./proposed-tags.md', import.meta.url), report)
    console.log(`\nWrote ${proposedTally.size} proposed tags to scripts/enrich/proposed-tags.md`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Enrichment job failed:', err)
  process.exit(1)
})
