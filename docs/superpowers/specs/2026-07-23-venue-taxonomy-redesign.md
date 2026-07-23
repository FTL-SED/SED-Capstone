# Venue Taxonomy Redesign

Date: 2026-07-23
Status: proposal (architecture — not yet implemented)
Scope: SF-only itinerary planner. Redesign the venue tag taxonomy so recommendation dimensions score independently. `normalizeTag()` and the `canonical → variants[]` vocab structure are **kept as-is** — this adds buckets, it does not change the normalization mechanism.

---

## 1. Critique of the current taxonomy

The catalog currently has four buckets: `category`, `cuisines`, `diets`, `interests`. The problem is entirely in **`interests`** — it is a dumping ground for concepts that answer different questions and should never compete on one axis:

- **Venue type** (`museum`, `bar`, `coffee`, `gallery`) — *what a place fundamentally is*
- **Activity** (`hiking`, `live music`, `shopping`) — *what you do there*
- **Vibe** (`romantic`, `cozy`, `trendy`) — *how it feels*
- **Occasion** (`date night`, `family`, `late night`) — *why you go*
- **Attributes of place-quality** (`scenic`, `photography`, `historic`) — *subjective descriptors*

Concrete failure modes this causes in the current engine (`services/recommendation/score.js`):

1. **One flat overlap score conflates orthogonal signals.** `matchCount` counts how many of a pin's `interests` are in `groupTags`, saturating at `INTENSITY_SATURATION=3`. A café tagged `coffee, cozy, work-friendly, casual` looks like a "3+ match" for a user who picked `coffee` — the vibe/amenity tags inflate intensity even though the user only asked for one real thing. Signal and noise are summed.
2. **Restaurants and activities use disjoint fields** (`cuisine` vs `interests`), so a restaurant can never match a *vibe* or *occasion* the user wants ("romantic dinner") — vibe lives nowhere. The engine literally cannot represent "romantic sushi date night."
3. **The proposed-tags report from AI enrichment surfaced the mess quantitatively**: 1,697 distinct out-of-vocab tags, dominated by exactly these mixed concepts — `casual` (923), `bar` (165), `cocktails` (136), `date-night`, `mission` (neighborhood), `cozy`, `late-night`. They don't fit `interests` because `interests` is trying to be five buckets at once.
4. **UX leak risk:** `interests` doubles as the user-selectable list. If we keep piling venue-types/vibes/cuisines into it, the picker becomes hundreds of options.

**Diagnosis:** the vocab *mechanism* (`canonical → variants`, `normalizeTag`, `buildLookup`) is good and should stay. The *bucket set* is wrong. Fix the buckets, keep the machine.

---

## 2. Proposed taxonomy

Split into **mutually independent buckets**, each answering one question. Only buckets that genuinely move recommendation quality for a *day-itinerary* app are included — I deliberately reject some tempting ones (see Tradeoffs).

| Bucket | Question | Cardinality | Field type | Scoreable? | User-facing? |
|---|---|---|---|---|---|
| **category** | restaurant vs activity? (structural gate) | 1 (enum-like) | scalar string | gate, not scored | no (implicit) |
| **venueType** | what IS it? (café, museum, bar, park…) | 1–2 | `String[]` | yes | via UI chips |
| **cuisine** | what food? | 0–4 | `String[]` | yes (restaurants) | yes |
| **diet** | dietary fit? | 0–3 | `String[]` | **hard filter**, not scored | yes |
| **activity** | what do you DO there? (hike, live music, shop) | 0–3 | `String[]` | yes | via UI chips |
| **vibe** | how does it FEEL? (romantic, cozy, trendy) | 0–3 | `String[]` | yes (soft/bonus) | yes |
| **occasion** | why go? (date night, family, solo, group) | 0–3 | `String[]` | yes (soft/bonus) | yes |
| **amenity** | practical features (rooftop, outdoor seating, wifi) | 0–4 | `String[]` | soft filter/bonus | limited |
| **priceTier** | how expensive? | 1 | scalar (enum) | yes (with budget) | yes |
| **neighborhood** | where in SF? | 1 | scalar string | yes (locality/meeting-point) | yes |

**Rejected buckets** (YAGNI for this app): `audience` (folds into `occasion`), `eventType`/`eventGenre` (this is a venue catalog, not an events feed — a `live music` *activity* + `liveMusic` genre-in-vibe covers the 91 live-music venues we have; a full event schema is premature), `timeOfDay` (already derivable from `hoursOpen` + `meal`, and the engine schedules by time window — a tag would duplicate real data). `meal` stays where it is — it's a per-**stop** concept (`ItineraryStop.mealType`), not a venue property, so it does NOT become a venue bucket.

Why this set improves recommendations: each user desire maps to exactly one bucket, so the engine can weight them independently (§7). "Romantic" no longer inflates a coffee match; "sushi" no longer competes with "museum."

---

## 3. Schema changes (Prisma)

Current `Pin`:
```prisma
category   String   @default("activity")
interests  String[]
cuisines   String[]
diets      String[]
rating     Float?
pricePerPerson Float
```

Proposed:
```prisma
model Pin {
  category      String     @default("activity")   // KEEP — structural gate (restaurant|activity)
  cuisines      String[]                            // KEEP — already correct
  diets         String[]                            // KEEP — already correct

  // interests[] is SPLIT (see migration §4) into three independent buckets:
  venueTypes    String[]                            // NEW — café, museum, bar, park, gallery…
  activities    String[]                            // NEW — hiking, live-music, shopping, tours…
  vibes         String[]                            // NEW — romantic, cozy, trendy, lively…
  occasions     String[]                            // NEW — date-night, family, solo, group…
  amenities     String[]                            // NEW — rooftop, outdoor-seating, wifi…

  neighborhood  String?                             // NEW — scalar; one SF neighborhood
  priceTier     Int?                                // NEW — 1–4 ($–$$$$), derived from pricePerPerson

  // REMOVE after migration:
  // interests   String[]   → superseded by venueTypes + activities + vibes + occasions
}
```

Decisions:
- **Arrays** for `venueTypes, activities, vibes, occasions, amenities, cuisines, diets` — a venue is legitimately several (a rooftop bar with live music is `bar` + `liveMusic`-activity + `rooftop`-amenity). GIN-indexable for `hasSome` filtering.
- **Scalars** for `category`, `neighborhood`, `priceTier` — a venue has exactly one. `category` and `priceTier` are effectively enums; I keep `category` a `String` (matches the existing "grow vocab without a migration" philosophy the codebase chose for transport/mealType) and make `priceTier` an `Int` (1–4) so budget math is arithmetic, not string-matching. A true Prisma `enum` is possible but adds migration friction for each new value — not worth it here.
- **Rename:** none needed beyond the conceptual split; `cuisines`/`diets` keep their names.
- **Remove:** `interests[]` — replaced by the four split buckets. This is the one destructive change and is handled by the migration below.

Why each helps recommendation quality:
- `venueTypes` separated from `activities`/`vibes` → a "museum" query scores against venue type only, not diluted by a museum's vibe tags.
- `vibes`/`occasions` as their own soft buckets → "romantic date night" becomes representable and *tunable* (they should nudge, not dominate — §7).
- `priceTier` as an Int → the engine can score "cheap" as a real preference alongside the existing hard budget cap, instead of it being an unsearchable free-text tag.
- `neighborhood` scalar → enables "places in the Mission" and reinforces the meeting-point locality signal without a geo query.

`normalizeTag(bucket, tag)` is unchanged — it already takes the bucket name as a parameter, so we just register new lookups (`venueType`, `activity`, `vibe`, `occasion`, `amenity`) in `LOOKUPS`. **No change to the function.**

---

## 4. Migration strategy

Additive-then-cutover, so nothing breaks mid-flight (mirrors how this repo did `source`/`enrichedAt`):

1. **Add** the new nullable/array columns (`venueTypes`, `activities`, `vibes`, `occasions`, `amenities`, `neighborhood`, `priceTier`) in one additive migration. `interests` stays for now.
2. **Backfill by reclassifying existing `interests`** into the new buckets using a static mapping table (each current interest value → its target bucket): e.g. `museum→venueType`, `coffee→venueType`, `hiking→activity`, `live music→activity`, `scenic/photography→activity or vibe`, `romantic→vibe`. Backfill `priceTier` from `pricePerPerson` (bands), `neighborhood` from reverse-geocoding lat/lng against SF neighborhood polygons (offline, one-time).
3. **Re-run AI enrichment** (the existing batch job, extended to emit the new buckets) to fill vibes/occasions/amenities that don't exist in today's data at all — these are net-new signal.
4. **Cut over the engine + UI** to read the new buckets.
5. **Drop `interests`** in a final migration once nothing reads it.

Register the new vocab lookups in `config/tagVocab.js` alongside the existing four. `normalizeTag` picks them up for free.

---

## 5. Example vocabularies (canonical → variants)

Keeping the existing `canonical → [variants]` shape so `buildLookup`/`normalizeTag` work unchanged. Abbreviated:

```js
export const VENUE_TYPES = {
  cafe:      ['coffee', 'coffee-shop', 'espresso', 'tea-house', 'bubble-tea'],
  restaurant:['diner', 'bistro', 'eatery'],
  bar:       ['pub', 'cocktail-bar', 'wine-bar', 'dive-bar', 'lounge', 'brewery', 'taproom'],
  bakery:    ['patisserie', 'pastries'],
  museum:    ['gallery', 'exhibition'],
  park:      ['garden', 'plaza', 'green-space'],
  landmark:  ['monument', 'viewpoint', 'vista'],
  theater:   ['cinema', 'playhouse', 'concert-hall'],
  market:    ['farmers-market', 'food-hall', 'grocery'],
  gym:       ['fitness-studio', 'yoga-studio', 'climbing-gym'],
  shop:      ['boutique', 'bookstore', 'record-store'],
}
export const ACTIVITIES = {
  'live-music': ['live-jazz', 'concert', 'gig'],
  hiking:       ['trail', 'walk', 'nature-walk'],
  shopping:     ['browsing', 'retail'],
  sightseeing:  ['scenic', 'photography', 'views'],
  tour:         ['guided-tour', 'tasting', 'class'],
  nightlife:    ['dancing', 'clubbing', 'karaoke'],
  relaxing:     ['spa', 'wellness'],
}
export const VIBES = {
  romantic:    ['intimate', 'date-worthy'],
  cozy:        ['warm', 'homey'],
  trendy:      ['hip', 'instagrammable', 'buzzy'],
  upscale:     ['fancy', 'fine-dining', 'elegant'],
  casual:      ['laid-back', 'chill', 'relaxed'],
  lively:      ['bustling', 'energetic'],
  historic:    ['old-school', 'classic', 'traditional'],
  'hidden-gem':['local-favorite', 'under-the-radar'],
  'family-friendly': ['kid-friendly'],
}
export const OCCASIONS = {
  'date-night': ['romantic-dinner', 'anniversary'],
  family:       ['kids', 'group-friendly'],
  solo:         ['work-friendly', 'quiet'],
  'group':      ['celebration', 'birthday'],
  brunch:       ['weekend'],
}
export const AMENITIES = {
  'outdoor-seating': ['patio', 'sidewalk-seating'],
  rooftop:           ['roof-deck'],
  wifi:              ['work-friendly'],
  'waterfront':      ['bayfront', 'ocean-view'],
  'reservations':    ['bookable'],
}
export const NEIGHBORHOODS = {
  mission: ['mission-district'], 'north-beach': [], soma: [], castro: [],
  tenderloin: [], richmond: [], sunset: [], chinatown: [],
  haight: ['haight-ashbury'], 'fishermans-wharf': [], marina: [], /* … SF set */
}
export const PRICE_TIERS = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' } // stored as Int
```

---

## 6. Example venue tagged with the new system

`Che Fico` (a real dedup survivor in our DB), before vs after:

```jsonc
// BEFORE (today)
{ category: "restaurant", cuisines: ["italian"], diets: [],
  interests: ["food", "casual"], rating: 4.5, pricePerPerson: 70 }

// AFTER
{ category: "restaurant",
  venueTypes: ["restaurant"],
  cuisines: ["italian"],
  diets: [],
  activities: [],
  vibes: ["trendy", "upscale"],
  occasions: ["date-night"],
  amenities: ["reservations"],
  neighborhood: "nopa",
  priceTier: 4,
  rating: 4.5, pricePerPerson: 70 }
```

Every concept now lives in its own bucket; `casual`/`food` (noise) are gone, replaced by real, independent signal.

---

## 7. Example query — "romantic sushi date night" — scored

User selects: `vibe: romantic`, `cuisine: sushi→japanese`, `occasion: date-night`. (UI maps chips to buckets — §"UX".)

**New scoring model** — each bucket contributes its own sub-score, combined with tuned weights, replacing today's single `interests`-vs-`cuisine` overlap. Building on the existing `coverage/intensity/quality` frame:

```
score(pin) =
    w_cat      * categoryGate(pin, query)          // 0 or 1 — restaurant required? hard-ish
  + w_cuisine  * overlap(pin.cuisines,  query.cuisines)
  + w_vtype    * overlap(pin.venueTypes, query.venueTypes)
  + w_activity * overlap(pin.activities, query.activities)
  + w_vibe     * overlap(pin.vibes,     query.vibes)       // SOFT — bonus, capped
  + w_occasion * overlap(pin.occasions, query.occasions)   // SOFT — bonus, capped
  + w_price    * priceFit(pin.priceTier, query.budget)
  + w_quality  * (rating/5)
  - hardFilter: diet must pass (unchanged), category gate, budget cap (unchanged)
```

Suggested weights (sum ≈ 1; vibe/occasion deliberately smaller so they *rank ties*, never override a cuisine miss): `cuisine 0.30, venueType 0.15, activity 0.10, vibe 0.12, occasion 0.10, price 0.08, quality 0.15`.

Worked example, two candidates for "romantic sushi date night":
- **Omakase sushi bar, NoPa, $$$, vibes:[romantic,intimate], occasions:[date-night]:**
  cuisine japanese ✓ (0.30) + venueType restaurant ✓ (0.15) + vibe romantic ✓ (0.12) + occasion date-night ✓ (0.10) + quality 4.7/5 (0.14) ≈ **0.81**
- **Cheap ramen counter, casual, japanese, no romantic/date tags:**
  cuisine japanese ✓ (0.30) + venueType restaurant ✓ (0.15) + vibe ✗ (0) + occasion ✗ (0) + quality 4.3/5 (0.13) ≈ **0.58**

Both match the *cuisine*, but the omakase bar wins on the independent vibe+occasion axes — which is exactly the intent "romantic date night" encodes. Under **today's** flat model, both would score nearly identically (both just match `japanese`), because vibe/occasion have nowhere to live. That is the concrete quality gain.

Key property: because vibe and occasion are **separate, lower-weighted** terms, a venue that is romantic but serves the wrong cuisine still can't outrank a correct-cuisine venue — vibe breaks ties, it doesn't hijack relevance.

---

## Scraping — how each source populates each bucket

| Bucket | Google Places | OpenStreetMap | AI enrichment |
|---|---|---|---|
| category | ✅ `types[]` | ✅ `amenity`/`shop` | fallback |
| venueType | ✅ reliable (`types`) | ✅ reliable (`amenity=cafe/bar/restaurant`) | fallback |
| cuisine | ✅ `types`/name | ✅ `cuisine=` tag | fill gaps |
| diet | ⚠️ partial | ⚠️ `diet:vegan=yes` sometimes | fill gaps |
| activity | ⚠️ partial | ⚠️ partial | ✅ often AI |
| **vibe** | ❌ | ❌ | ✅ **AI only** |
| **occasion** | ❌ | ❌ | ✅ **AI only** |
| amenity | ✅ `outdoor_seating`, some | ✅ some (`outdoor_seating=yes`) | fill gaps |
| priceTier | ✅ `price_level` | ❌ | infer from name/type |
| neighborhood | ⚠️ from address | ✅ from coords (offline polygon) | — |

**Reliably scraped (objective):** category, venueType, cuisine, amenity, priceTier (Google), neighborhood (coords). **Must be AI-generated (subjective, no source has them):** vibe, occasion, and the softer activities/audience signals.

## AI enrichment — which tags are AI-ONLY

- **AI-only (subjective — no scraper can know these):** `vibes` (romantic, cozy, trendy, upscale, hidden-gem), `occasions` (date-night, family, solo). These are *interpretations*, not facts.
- **AI as fallback only (objective — prefer the scraper, AI fills gaps):** venueType, cuisine, amenity, priceTier. Never let AI *override* a scraped objective value — it should only fill nulls.
- This division matters: AI ratings/vibes are estimates (the same caveat we already carry for OSM ratings). Keep objective buckets source-of-truth = scraper; subjective buckets source-of-truth = AI.

## UX — what users see

- **User-selectable (mapped to simplified chips):** a curated ~15–20 chips, each fanning out to multiple internal tags. E.g. a **"Coffee"** chip → `venueType:cafe` + `activity:relaxing` + `amenity:wifi`; a **"Romantic"** chip → `vibe:romantic` + `occasion:date-night`; a **"Foodie"** chip → the cuisine bucket. Users pick intent; the app expands to buckets.
- **Internal-only (never shown as raw tags):** `amenities` (surfaced as filters, not interest chips), `neighborhood` (a map/location control, not a chip), `priceTier` (a `$`–`$$$$` slider), raw `venueTypes`/`vibes` values.
- Chips → buckets is a small static map (chip → {bucket: [values]}), so the hundreds of internal tags never leak to the UI.

---

## 8. Tradeoffs & scale

**Why this scales to 100k+ venues:**
- **Independent buckets = independent GIN indexes.** Each `hasSome` filter (cuisine, venueType, amenity) hits its own index; queries stay sub-linear as the catalog grows. A single overloaded `interests[]` can't be indexed meaningfully because every query touches it.
- **Normalization mechanism is unchanged and O(1).** `normalizeTag` is a Map lookup per tag regardless of catalog size; adding buckets adds Maps, not complexity.
- **Scoring is linear in buckets, not venues** — a fixed ~7-term weighted sum per candidate, same cost profile as today's 3-term score.
- **Source-of-truth per bucket** (scraper for objective, AI for subjective) means re-scraping/re-enriching is idempotent and bucket-scoped — you can refresh cuisines from Google without disturbing AI vibes.

**Costs / tradeoffs honestly:**
- **More columns + more AI enrichment surface.** Vibes/occasions need an AI pass; that's cost (bounded, batched, like the run we just did). Mitigation: only AI-fill the subjective buckets; objective ones come from scrapers.
- **Migration is real work** — splitting `interests` + backfilling + a re-enrich + a final drop. Additive-first keeps it safe but it's multi-step.
- **Vocab curation burden grows** (more buckets to maintain). Mitigation: the `canonical → variants` normalization already absorbs scraped noise, and the proposed-tags report gives a data-driven way to grow each bucket.
- **Over-tagging risk:** vibe/occasion are subjective and could get noisy. Mitigation: keep their weights low (they rank ties, not relevance) and cap tags-per-bucket in enrichment.

**Bottom line:** the redesign trades a one-time migration + a subjective-tag AI pass for a taxonomy where every user intent has exactly one home and every dimension scores independently — which is the specific thing the current flat `interests` bucket makes impossible.
