# Design: Pin Table Split (venue-only `Pin` + `ItineraryStop`), per-day hours, explicit tag fields

## Summary

Split the overloaded `Pin` table so it stores **one row per real venue**, and move
per-visit data into a new **`ItineraryStop`** table. While we're touching all this
data, also:

- Add a real **per-day `hoursOpen`** JSON column (replacing today's approximation of
  hours from `startTime`/`endTime`).
- Replace the single derived `tags` array with **explicit `interests` / `cuisines` /
  `diets` fields** and an explicit `category`, removing the vocab-lookup classification.

The overarching constraint: **the API response shape stays identical**, so the
frontend never changes. Storage migrates; the contract does not.

This addresses Issue 4 from `.claude/schema-review-updated.md` and folds in the
per-day-hours and tag-split decisions.

## Motivation

`Pin` currently serves two purposes at once — a catalog venue (`itineraryId = null`)
and an itinerary stop (`itineraryId` set). This forces three "clever" workarounds:

1. **Dedup on every read** (`dedupePins`) — the same venue exists once per itinerary
   that uses it.
2. **Privacy filter** (`OR: [{ itineraryId: null }, { itinerary: { isPublic } }]`) —
   to keep private-draft pins out of recommendations.
3. **The `orderInItinerary` NULL quirk** — catalog pins carry a meaningless
   `orderInItinerary = 0`, and the unique constraint only "works" via NULL
   distinctness.

Plus two derivations that are themselves clever:
- `openingHours` is faked from the pin's scheduled `startTime`/`endTime`.
- `category`/`cuisine`/`diet` are inferred from the free-form `tags` array by
  cross-referencing `config/tagVocab.js`.

Splitting the table and using explicit fields removes all five.

## Final schema

### `Pin` — venue only (keeps its name)

```prisma
model Pin {
  id               Int             @id @default(autoincrement())
  name             String
  description      String?
  category         String          // 'restaurant' | 'activity' — explicit, not derived
  interests        String[]        // activity matching: 'museum', 'nature', 'scenic_views'
  cuisines         String[]        // restaurant matching: 'mexican', 'sushi'
  diets            String[]        // diet filtering: 'vegan', 'vegetarian'
  rating           Float?
  pricePerPerson   Float           // a fact about the venue, stays here
  hoursOpen        Json?           // per-day: { "mon": "08:00-22:00", ..., "sun": null }
  latitude         Float
  longitude        Float
  address          String?
  locationImageUrl String?
  stops            ItineraryStop[]
}
```

Columns that **leave** `Pin`: `itineraryId`, `orderInItinerary`, `startTime`,
`endTime`, `travelTimeToNextMinutes`, `distanceToNextMeters`, `tags`, and the
`@@unique([itineraryId, orderInItinerary])` constraint + `itinerary` relation.

### `ItineraryStop` — one row per visit

```prisma
model ItineraryStop {
  id                      Int       @id @default(autoincrement())
  pinId                   Int       // → the venue Pin
  itineraryId             Int       // → the trip
  orderInItinerary        Int
  startTime               DateTime
  endTime                 DateTime
  travelTimeToNextMinutes Int?
  distanceToNextMeters    Float?
  mealType                String?   // 'breakfast'|'lunch'|'dinner' — was folded into tags before
  note                    String?

  pin       Pin       @relation(fields: [pinId], references: [id])
  itinerary Itinerary @relation(fields: [itineraryId], references: [id], onDelete: Cascade)

  @@unique([itineraryId, orderInItinerary])
}
```

`Itinerary` gains `stops ItineraryStop[]` (replacing `pins Pin[]`).

## Key design decisions (from brainstorming)

1. **`Pin` keeps its name** — venue-only. Minimizes churn across `models/pins.js`,
   `pinsRepository`, `pinController`. The *new* table is `ItineraryStop`.
2. **`pricePerPerson` stays on `Pin`** — a venue fact, not per-visit.
3. **Per-day `hoursOpen` as one JSON column**: `{ "mon": "08:00-22:00", ..., "sun": null }`.
   Single range per day (no split hours). `null` for a day = closed that day.
4. **Engine needs the trip day** → add a **`tripDate`** to the `/recommendations`
   input; derive day-of-week; look up `hoursOpen[day]`.
5. **`null` day = hard "closed" ⇒ drop** (distinct from unknown). But `hoursOpen`
   *entirely absent* = unknown ⇒ keep + flag (preserves the "missing data never
   drops" principle).
6. **Parsing seam:** `pinsRepository.mapPin` parses `hoursOpen[tripDay]`
   (`"08:00-22:00"`) into the existing `[{ open, close }]` interval shape. The
   engine's `isOpenInWindow`/`hasUsableHours` and the AI prompt's `openingHours`
   are **unchanged** — only `mapPin`'s source changes.
7. **Explicit tag fields** — `interests`/`cuisines`/`diets` + explicit `category`
   replace the single `tags` array. Removes `tagVocab.js`'s classification role and
   `mapPin`'s derivation. `diets` still maps to `undefined` (never `[]`) when empty,
   preserving `passesDiet`'s missing-data rule.
8. **`mealType` moves to `ItineraryStop`** — it's a per-visit fact; today it's folded
   into `pin.tags` by `persist.js` and dug back out by the frontend. Now it's a real
   column.
9. **API stays identical** — itinerary reads reshape `ItineraryStop + Pin` back into
   the flat `pins[]` array the frontend already consumes. Because the split removes
   the `tags` column, the reshape must **reconstruct a `tags` array** for each pin
   (concatenating `interests + cuisines + diets`, plus `mealType` appended when
   present) so `WrittenItinerary`'s meal badge and any tag display keep working with
   zero frontend change. The reshape is the compatibility layer.

## Migration strategy (why it's safe)

Add new pieces alongside the old, backfill, switch reads, switch writes, drop old
columns last. The app is never half-broken between merges, and **you can stop after
the reads phase** and still have the main wins (no dedup, no privacy filter, real
hours). Full phase/task breakdown lives in `.claude/pin-split-tasks.md` and will be
turned into an implementation plan.

## Components affected

**Backend**
- `prisma/schema.prisma` — new `ItineraryStop`, reshaped `Pin`, `Itinerary.stops`.
- `models/pins.js` — venue-oriented; `models/itineraryStops.js` (new).
- `models/itineraries.js` — `itineraryInclude` includes `stops → pin`; reshape to `pins[]`.
- `services/recommendation/pinsRepository/` — read venue `Pin`; drop dedup + privacy filter; parse `hoursOpen`; read explicit `interests`/`cuisines`/`diets`.
- `services/recommendation/helpers/helpers.js` — `isOpenInWindow` gains the `null`-day = drop rule (via the filter); interval logic otherwise unchanged.
- `services/recommendation/filters/` — the new "closed that day" hard drop.
- `services/itinerary/persist.js` — `stopsToStops` writes `ItineraryStop` rows; `mealType` becomes a column.
- `controllers/pinController.js` + `routes/pinRoutes.js` — stop CRUD referencing a venue `Pin`.
- `controllers/itineraryController.js` — `copyItinerary` duplicates stops, not venues.
- `middleware/validateRecommendationInput.js` — accept + validate `tripDate`.
- `scripts/seedSfPlaces.js`, `prisma/data/sfPlaces/*`, `prisma/seed.js` — new shape + real `hoursOpen` + split tag fields.
- `config/tagVocab.js` — classification role removed (kept only if still needed for input validation of the split fields).

**Frontend**
- **No changes required** if the itinerary read reshapes to the existing `pins[]`
  shape. The Discover `?interests=` filter query changes server-side only
  (`interests: { hasSome }` instead of `tags: { hasSome }`) — same request/response.
- Verify: `ItineraryPage`, `MapView` (reads `pin.latitude/longitude/name`),
  `WrittenItinerary` (reads meal badge from tags — confirm mealType still surfaces),
  `PinDetailModal` (`locationImageUrl`).

## Testing

- Every phase ships behind the existing 208-test suite staying green.
- New tests: `hoursOpen` parsing (`mapPin`), the `null`-day drop, the reshaped
  itinerary read matches the old pin shape (compatibility assertion), backfill
  reconciliation (counts + no orphans), Hawk Hill privacy test adapted (private
  drafts simply aren't venues).

## Open questions (resolve during planning)

1. **`mealType` on read** — the reshape appends it to the reconstructed `tags` array
   (so `WrittenItinerary`'s existing badge logic works unchanged). Should we *also*
   surface it as a first-class `mealType` field for future frontend use? (Leaning:
   yes — append to tags for compatibility AND expose the field.)
2. **`tripDate` requiredness** — required, or optional with a sensible default day
   when omitted (matching persist.js's `'2026-01-01'` fallback)?
3. **Backfill of real `hoursOpen`** — start every catalog pin with a neutral
   `08:00-22:00` all-week and refine real hours later, or curate real hours up front?
4. **`category` fully explicit vs. lightly derived** — store the column (recommended)
   vs. compute from "has any cuisine/diet".

## Out of scope (separate stretch)

Saved user preferences + friend requests — see
`.claude/docs/user-preferences-and-friends-stretch.md`. Independent of this work.
