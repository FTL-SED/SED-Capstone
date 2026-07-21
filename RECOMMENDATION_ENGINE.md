# NavQuest Recommendation Engine — Onboarding Guide

This document explains the recommendation engine end to end so that an engineer who has
never seen this codebase can confidently modify or extend it. It assumes only basic
knowledge of JavaScript, Express, and Prisma. Everything specific to this feature is
explained from scratch.

---

## 1. Purpose

### What problem does this feature solve?

NavQuest builds day itineraries for **groups** of people. A group has several members,
each starting from a different location, each with their own interests (museums, hiking,
live music), food preferences (Mexican, sushi), and dietary restrictions (vegan,
gluten-free). The group also sets shared constraints: a start and end time for the day,
a per-person budget, and how far they're willing to travel.

The hard question is: **out of a catalog of ~400 real San Francisco places, which ones
should this specific group actually consider visiting today?**

Answering that by hand is impossible. You have to respect everyone's diet, stay inside
the budget, drop places that are closed or too far away, and then rank the survivors so
the *best* options for *this group* rise to the top — while still being fair to the
member whose taste is a bit niche. The recommendation engine does exactly this. It takes
the group + trip constraints and returns a **ranked shortlist** of places.

### Why does it exist?

It exists as a distinct, self-contained step for two reasons:

1. **It feeds the AI.** NavQuest has a second step (`POST /ai-agent`) that takes the
   shortlist and sequences it into an actual timed schedule ("9:00 coffee → 10:30
   museum → 1:00 lunch…"). The AI is expensive and slow, so we don't want it reasoning
   over all 400 places. The recommendation engine narrows 400 places down to a few dozen
   *good* ones first. The AI then only has to order and time the good ones.

2. **It is deterministic and testable.** Everything except the one database read is a
   pure function (no database, no network, no randomness). That means the whole ranking
   pipeline can be unit-tested with plain JavaScript objects, which is why almost every
   file has a co-located `*.test.js`.

### When is it used?

It runs whenever a user finishes the "Create Itinerary" wizard and the frontend calls
`POST /recommendations`. The response (shortlist + constraints) is then handed to the AI
sequencing step. It is the **first** of the two AI-pipeline stages.

---

## 2. High-Level Flow

Here is the complete path a request takes. Each box is explained below the diagram.

```
Client (frontend wizard)
      │  POST /recommendations   { trip, members }
      ▼
routes/recommendationRoutes.js         ── URL-to-handler wiring
      │
      ▼
middleware/auth.js  (requireAuth)       ── "are you logged in?"
      │
      ▼
middleware/validateRecommendationInput  ── "is the payload well-formed?"
      ▼
controllers/recommendationController.js ── HTTP glue only
      │  calls getRecommendations(trip, members)
      ▼
services/recommendation/index.js        ── the ONE place that touches the DB
      │  step 1 — load places:  getAllPins(tripDate)
      │             → pinsRepository → Prisma → PostgreSQL (Pin table)
      │             → mapVenue turns each DB row into an engine "pin"
      │  step 2 — rank them:     recommend(trip, members, pins)
      ▼
services/recommendation/recommend/recommend.js   ── the pure pipeline
      │
      ├─ Stage 0/1: hardFilter()   drop places that break a real constraint
      ├─ Stage 2:   scoreAndSort()  give each survivor a 0–1 score, sort
      ├─           enrichMissing()  (no-op stub today)
      ├─           assembleWithFoodQuota()  build the shortlist, balance food vs. activities
      ├─           ensureEveryMemberCovered()  guarantee no member is left out
      └─           ensureEveryDietCovered()    guarantee each dieted member has a meal
      │
      ▼
  { shortlist, constraints }
      │
      ▼
controllers/recommendationController.js ── 200 JSON (or a friendly empty reason, or 500)
      │
      ▼
Client
```

**Step-by-step meaning:**

- **Route** — decides which functions handle `POST /recommendations`, and in what order.
  It attaches the two middleware and the controller. No logic lives here.
- **`requireAuth`** — confirms the caller is a signed-in, provisioned user. If not, it
  stops the request with `401` and the rest never runs.
- **`validateRecommendationInput`** — confirms the request body has the right shape
  (valid times, budget, per-member coordinates and prefs, etc.). If not, it stops with
  `400`. The wizard sends the `members` array directly — each person carries their own
  interests/food/diet — so there's no transformation to do here, just validation.
- **Controller** — pulls `trip` and `members` off the request, calls the service, and
  turns whatever comes back into an HTTP response. It contains no ranking logic.
- **`services/recommendation/index.js`** — the seam between "the web" and "the engine."
  It reads the place catalog from the database (the only DB access in the whole feature)
  and then calls the pure `recommend()` function.
- **`recommend()`** — the actual algorithm: filter → score → sort → assemble → fairness.
- The **shortlist + constraints** flow back out the same way they came in.

### The write path (how places get into the catalog)

The flow above is the **read path** — a recommendation request. But the engine can only
read places that were written to the `Pin` table first. There are two ways a place gets
there, and both now store the **same structured columns** the engine reads directly
(`category`, `interests`, `cuisines`, `diets`, plus coords/price/hours):

```
① SEEDING (offline, bulk)                    ② USER CREATES A VENUE (live request)
  prisma/data/sfPlaces/*.js                     POST /pins   { category, interests,
  prisma/seed.js                                              cuisines, diets, ... }
   │  each entry already carries                    │
   │  category/interests/cuisines/diets             ▼
   ▼                                          controllers/pinController.js
  seed scripts (npm run seed:places,             │  validates the structured fields
  npx prisma db seed)                            │  (no tag translation)
   │  store the columns verbatim                  ▼
   └───────────────────┬──────────────────────  stores the columns verbatim
                       ▼
                   Pin table  (category │ interests │ cuisines │ diets │ … )
                       │
                       └───────────►  read later by the engine (getAllPins → mapVenue)
```

**Key point:** there is **no tag-to-column translation step**. Whatever is written *is*
what the engine reads (after `mapVenue`'s read-time normalization — `[] → undefined` and
resolving hours to the trip's weekday). Earlier versions supplied a free-form `tags` array
and derived the columns from it via a `classify.js` module; that indirection was removed
so venue input is structured end to end, exactly like member preferences. See the note in
§3 under `pinsRepository/mapVenue.js`.

---

## 3. File Responsibilities

This section explains *why each file exists* and *where it sits in the chain*, not just
what its functions do. The engine is organized in strict layers (per the repo's
`.claude/rules/backend.md`): **route → middleware → controller → service → model/repository
→ Prisma**, with `config/` and `utils/` as shared helpers. A file's job is defined by its
layer.

### `backend/routes/recommendationRoutes.js`
**Why it exists:** Express needs to know that a `POST` to `/recommendations` should run a
specific chain of functions. This file is that wiring and nothing else.
**Responsibility:** Declare the one route and attach, in order, `requireAuth`,
`validateRecommendationInput`, then `postRecommendations`.
**Called by:** `backend/index.js`, which mounts this router under the `/recommendations`
prefix.
**Calls:** the two middleware and the controller (by reference — Express calls them).
**Why here and not elsewhere:** Routing is a separate concern from *doing* the work.
Keeping it thin means you can see the whole request lifecycle for this endpoint in three
lines.

### `backend/middleware/auth.js` (`requireAuth`)
**Why it exists:** Every protected route needs the same "is this a real logged-in user?"
check. Rather than copy that into each controller, it lives here once.
**Responsibility:** Read the `Authorization: Bearer <token>` header, ask Supabase who the
token belongs to, look up the matching app-side `User` row, and attach it to `req.user`.
If any step fails, respond `401` and do **not** call `next()` (so the controller never
runs).
**Called by:** the route (and every other protected route in the app).
**Calls:** `lib/supabase.js` (to verify the token) and `models/users.js`
(`findByAuthUserId`, to load the profile).
**Why here:** Authentication is cross-cutting. It belongs in middleware so the controller
can *assume* a valid user and focus on the feature.

### `backend/middleware/validateRecommendationInput.js`
**Why it exists:** The engine trusts its inputs completely (it's pure math). Something has
to guarantee those inputs are well-formed *before* the engine sees them, so a bad payload
fails fast with a clear `400` instead of blowing up deep inside scoring.
**Responsibility:** Validate the payload. `trip` must have valid `HH:MM` start/end times
where end is after start, a non-negative budget, and an optional positive `travelRadius`.
Each member must have a name and real `{ latitude, longitude }` coordinates, plus optional
string-array preferences (`interestTags`/`foodPrefs`/`diet`). The wizard sends this
`members` array directly — each person carries their *own* prefs, which is what gives the
engine real per-person signal for coverage scoring and the fairness guarantee. There's no
group-to-members transformation: the engine's shape is exactly what the client sends.
**Called by:** the route.
**Calls:** nothing — it's self-contained validation.
**Why here:** Validation is explicitly a middleware responsibility. Doing it here keeps
the controller and engine free of defensive checks.

### `backend/controllers/recommendationController.js`
**Why it exists:** Something has to translate between HTTP (requests, status codes, JSON)
and the pure service. That translation is the controller's whole job.
**Responsibility:** Pull `trip` and `members` off `req.body`, call
`getRecommendations()`, and map the result to a response: a normal `200` with the
shortlist; a `200` with an added human-readable `reason` when the shortlist is *empty*
(an empty result is a normal outcome, not an error); or a `500` with a JSON error if the
service throws. It also owns `emptyReason()`, which picks a helpful hint ("try widening
your radius", "try raising your budget") based on the trip's constraints.
**Called by:** the route.
**Calls:** `services/recommendation/index.js` (`getRecommendations`).
**Why here:** The controller is the *only* layer allowed to touch `req`/`res`. Keeping the
"empty is not an error" and "wrap errors as JSON" decisions here means the engine stays a
pure function that just returns data.

### `backend/services/recommendation/index.js`
**Why it exists:** The engine is pure and must never query the database, but *someone*
has to load the place catalog. This file is that bridge — the only part of the whole
engine allowed to touch the DB.
**Responsibility:** Read the entire Pin catalog (via the repository), convert each row to
the engine's normalized "pin" shape, then call `recommend()` with the trip, members, and
those pins. It also defaults `tripDate` to a fixed day when the caller omits it (needed to
resolve per-day opening hours).
**Called by:** the controller.
**Calls:** `pinsRepository.getAllPins()` and `recommend/recommend.js`.
**Why here:** This is the deliberate boundary between "impure I/O" and "pure logic."
Everything below `recommend()` can be unit-tested with plain objects precisely because
this file absorbs the database dependency.

### `backend/services/recommendation/pinsRepository/pinsRepository.js`
**Why it exists:** All database access must go through a data-access module — controllers
and services never call Prisma directly. This is the recommendation engine's data source.
**Responsibility:** `getAllPins(tripDate)` loads every row from the `Pin` table and maps
each through `mapVenue` into the engine shape. It's written as a factory
(`makeGetAllPins(client)`) so tests can inject a fake Prisma client.
**Called by:** `services/recommendation/index.js`.
**Calls:** `lib/prisma.js` (the shared Prisma singleton) and `mapVenue.js`.
**Why here:** This is the "repository carve-out" the backend rules allow — a service may
own a repository that shapes rows into a *domain object* (the engine's pin), rather than
being a thin one-to-one table wrapper like `models/pins.js`.

### `backend/services/recommendation/pinsRepository/mapVenue.js`
**Why it exists:** The database row and the shape the engine wants are not the same. The
DB stores `cuisines`/`diets` as arrays that default to `[]`, and stores hours as a
per-weekday JSON blob. The engine needs cuisine/diet as `undefined` when unknown, and
needs the *specific* interval for the trip's weekday.
**Responsibility:** Convert one Pin row + the trip date into the engine's pin object. Two
subtle rules it enforces: (1) empty arrays become `undefined` via `emptyToUndefined` —
because the engine treats "unknown" (`undefined`) and "known-empty" (`[]`) very
differently (more in §6); (2) `openingHours` is resolved from *this pin's own* hours for
the trip's weekday, yielding a real interval, `null` (explicitly closed that day → hard
drop), or `undefined` (unknown → keep).
**Called by:** `pinsRepository.js`.
**Calls:** `utils/hours.js` (`parseDayHours`, `dayKeyFromDate`). It also defines its own
small `emptyToUndefined` helper (the `[] → undefined` rule) right here, since this is its
only caller.
**Why here:** Shape-mapping belongs next to the data-access code that produces it, so the
engine never has to know what a raw DB row looks like.

> **Note on venue classification (historical):** earlier versions supplied pins as a
> free-form `tags` array (e.g. `['food', 'mexican', 'vegan']`) and a `classify.js` module
> derived the structured `category`/`cuisines`/`diets`/`interests` columns from those tags
> at write time. That indirection has been removed: venue data is now stored as those
> structured columns directly — the seed files (`prisma/seed.js`,
> `prisma/data/sfPlaces/*`) carry them, and `controllers/pinController.js` accepts them
> straight from the client (mirroring how member prefs are sent). So there is no
> tag-to-column translation step anymore; what's stored is what the engine reads (after
> `mapVenue`'s `[] → undefined` normalization).

### `backend/controllers/pinController.js` (the write path)
**Why it exists:** This is the *other* side of the catalog — how a place gets *into* the
`Pin` table when a user adds a venue that isn't already seeded (`POST /pins`). The engine
never writes; this controller does.
**Responsibility:** For a brand-new venue it validates the structured fields the client
sends — `category` (a non-empty string) and `interests`/`cuisines`/`diets` (string arrays)
— then stores them **verbatim** on the `Pin` (defaulting the arrays to `[]` when omitted).
No derivation: the client supplies the same structured shape the engine reads, exactly
like member preferences are sent structured.
**Called by:** the `/pins` route.
**Calls:** `models/pins.js` and the itinerary-stop service (`addStop`).
**Why here:** It's a controller (HTTP + validation), so it lives with the other
controllers, not in the engine. It matters to the engine only because it's one of the two
producers of the catalog the engine consumes (the other being the seed scripts).

### `backend/services/recommendation/recommend/recommend.js`
**Why it exists:** This is the conductor. Each stage of the algorithm lives in its own
small module; this file wires them together in the right order and returns the final
`{ shortlist, constraints }`.
**Responsibility:** Build the group's combined interest/food sets once, then run:
`hardFilter` → `scoreAndSort` → `enrichMissing` → `assembleWithFoodQuota` →
`ensureEveryMemberCovered` → `ensureEveryDietCovered`. It also computes the fairness metric
(how far the worst-off member travels) and the `foodBelowMin` flag, and packages the
`constraints` object the AI step needs.
**Called by:** `services/recommendation/index.js`.
**Calls:** `filters`, `score`, `enrich`, `assemble`, `fairness`, `helpers`, `config`,
`utils/geo`.
**Why here:** Keeping orchestration separate from the individual steps means you can
change the *order* of the pipeline here without touching the steps, and change a *step*
without touching the orchestration.

### `backend/services/recommendation/filters/filters.js` (Stage 0 + Stage 1)
**Why it exists:** Before ranking, you must throw out places that are simply not eligible
— wrong diet, too expensive, closed, too far. That's a distinct concern from *ranking*
the eligible ones.
**Responsibility:** `hardFilter(pins, members, trip, groupTags)` computes the group's
fair **meeting point** (Stage 0) — the geometric median of member coordinates, then
**snapped to the nearest catalog pin** so the anchor is always a real land venue (the raw
median of members on opposite shores of a bay can land in the water). It then keeps a pin
only if it passes every hard constraint: relevance (activities must match a group interest;
restaurants must be edible by someone), within travel radius of that anchor, budget-sane,
not known-closed that day, and open in the time window. Crucially, **missing data never
drops a pin** — it's kept and tagged with a `priceUnknown`/`hoursUnknown` flag.
**Called by:** `recommend.js`.
**Calls:** `helpers/helpers.js` (all the primitive checks) and `utils/geo.js`
(`geometricMedian`, `nearestPoint`).
**Why here:** Filtering is a clean, separable stage — one place to look when a pin is
wrongly dropped or wrongly kept.

### `backend/services/recommendation/score/score.js` (Stage 2)
**Why it exists:** Once you have eligible places, you need a single number that says "how
good is this place *for this group*?" so you can sort them.
**Responsibility:** `softScore(pin, members, groupTags, groupFood)` returns a 0–1 score
combining **coverage** (what fraction of the group would like it), **intensity** (how
strongly it matches the group's tastes), and **quality** (its rating). It also exports
`memberLikes`, the single definition of "would this member like this pin," reused by the
fairness step so both agree.
**Called by:** `recommend.js` (scoring) and `fairness.js` (`memberLikes`).
**Calls:** `config/recommendation.js` (weights/constants) and `helpers/helpers.js`.
**Why here:** Scoring is the heart of ranking and changes often; isolating it makes the
weights and formula easy to find and tune.

### `backend/services/recommendation/assemble/assemble.js` (Step 6)
**Why it exists:** A pure score-sorted list could be all restaurants or all activities.
A real day needs a balance — some meals, mostly things to do. This file enforces that
balance.
**Responsibility:** `computeShortlistSize(trip)` estimates how many stops fit the time
window and multiplies to give the AI ~2–3× as many options as stops. `assembleWithFoodQuota`
walks the ranked list building the shortlist, capping restaurants at `FOOD_MAX` so food
can't dominate, and if meals fall below `FOOD_MIN` it floor-fills with the best-rated
remaining restaurants so the group always has enough meal choices.
**Called by:** `recommend.js`.
**Calls:** `config/recommendation.js` and `helpers/helpers.js`.
**Why here:** "How many, and in what mix" is a policy separate from "how good is each
one" (scoring) — so it gets its own module.

### `backend/services/recommendation/fairness/fairness.js` (Step 5)
**Why it exists:** Ranking by group-wide score can silently leave one member with nothing
they like — their favorite thing just never scored high enough. That's unfair, and this
file is the safety net.
**Responsibility:** `ensureEveryMemberCovered` guarantees every member has ≥1 pin they'd
like in the shortlist, injecting their best match if not. `ensureEveryDietCovered`
separately guarantees every member with a dietary restriction has ≥1 restaurant they can
actually eat at. Both are non-mutating (return new arrays).
**Called by:** `recommend.js`.
**Calls:** `score/score.js` (`memberLikes`) and `helpers/helpers.js`.
**Why here:** Fairness is a post-processing guarantee applied *after* ranking and
assembly, so it's the last stage — its own module keeps that intent explicit.

### `backend/services/recommendation/enrich/enrich.js`
**Why it exists:** A planned (not yet built) feature to enrich the top candidates with
live Google Places data (real ratings/prices/hours). The seam exists so wiring it in
later doesn't require restructuring `recommend()`.
**Responsibility:** Today, `enrichMissing(pins)` is a **no-op** that returns its input
unchanged.
**Called by:** `recommend.js`.
**Why here:** Leaving an explicit stub documents the intended extension point.

### `backend/services/recommendation/helpers/helpers.js`
**Why it exists:** The filter and score stages share a lot of small predicates —
"is this a restaurant?", "do these tags overlap?", "can this member eat here?", "is it
open in the window?". Centralizing them keeps every stage consistent.
**Responsibility:** Pure primitives: `isRestaurant`, `shareTag`, `overlap`,
`passesDiet`, `memberCanEat`, `estPricePerPerson`, `budgetSanityOk`, `isOpenInWindow`,
`toMinutes`, `hasUsableHours`, `withinRadius`, `pinIdentity`, `isClosedThisDay`, plus the
memoized member-set helpers.
**Called by:** `filters`, `score`, `assemble`, `fairness`.
**Calls:** `config/recommendation.js` and `utils/geo.js`.
**Why here:** These are the shared building blocks; keeping them in one file means a rule
like "unknown data → keep the pin" is implemented once and obeyed everywhere.

### `backend/config/recommendation.js`
**Why it exists:** Every tunable number the engine uses (weights, quotas, thresholds) is
here so behavior is changed by editing config, not by hunting through logic.
**Responsibility:** Export `CATEGORY`, `PRICE_LEVEL_USD`, `WEIGHTS`, `FOOD_MIN/MAX`,
`QUALITY_DEFAULT`, `INTENSITY_SATURATION`, `AVG_STOP_DURATION_MIN`, `SHORTLIST_MULTIPLIER`,
`ENRICHMENT_POOL_SIZE`, and the meeting-point iteration limits.
**Called by:** helpers, score, assemble, recommend, geo.
**Why here:** Constants read in more than one place belong in `config/`, never inlined.

### `backend/config/tagVocab.js`
**Why it exists:** The controlled vocabulary — the single source of truth for which tag
values are *accepted* for a venue's `category`/`cuisines`/`diets`/`interests`, plus a
`canonical → [variants]` synonym map. Its purpose is data ingestion + display: normalizing
messy inbound tags (scraped OSM / Google Places / AI-generated — e.g. `tex-mex` → `mexican`)
to one canonical word before storing, and showing users the accepted options.
**Responsibility:** Exports the vocab objects (`CATEGORIES`/`CUISINES`/`DIETS`/`INTERESTS`),
`normalizeTag(bucket, tag)` (variant → canonical, or `null` if unrecognized), and
`acceptedTags(bucket)` (the canonical list).
**Called by:** nothing at request time *yet* — venue data is currently hand-curated with
already-canonical tags, so this is the forward-looking contract for the scraping/normalization
path. Wire `normalizeTag` into that ingestion (and/or a "get options" endpoint) when it lands.
**Why here:** It's shared configuration/vocabulary, so it belongs in `config/`.
**Note:** the `emptyToUndefined` helper that briefly lived here (a read-time array-mapping
concern, not vocabulary) now lives in `mapVenue.js` next to its only caller.

### `backend/utils/geo.js`
**Why it exists:** Geographic math (distance, meeting point) is generic and reused beyond
the engine (the AI step uses it for travel distances too).
**Responsibility:** `haversineMiles` (distance between two points), `centroid`,
`geometricMedian` (the fair meeting point via Weiszfeld's algorithm), `nearestPoint`
(snaps a point to the closest of a set — used to pull the meeting point onto a real land
venue), `maxDistanceFrom` (the fairness metric), `milesToMeters`.
**Called by:** `filters.js`, `helpers.js`, `recommend.js`.
**Why here:** Pure, dependency-free, reusable math belongs in `utils/`, not tied to one
feature.

### `backend/utils/hours.js`
**Why it exists:** The DB stores hours as a per-weekday JSON object; the engine wants an
interval list for the *specific* trip day. This bridges the two.
**Responsibility:** `dayKeyFromDate` maps a `YYYY-MM-DD` date to a weekday key
(`mon`/`tue`/…) safely (UTC-noon probe, timezone-independent). `parseDayHours` turns that
day's value into `[{ open, close }]`, `null` (closed), or `undefined` (unknown).
**Called by:** `mapVenue.js`.
**Why here:** Generic date/time parsing → `utils/`.

### `backend/models/pins.js`
**Why it exists:** The thin, canonical data-access wrapper for the `Pin` table (`findById`,
`create`). Used by `pinController` when creating a venue for a new stop.
**Note:** The *engine* does not use this model for its bulk read — it uses its own
`pinsRepository` (the sanctioned carve-out) because it needs the domain-shaped mapping,
not a raw row.

---

## 4. Step-by-Step Execution

Here is exactly what happens during one real request, function by function, in order.

**1. HTTP arrives.** The frontend sends `POST /recommendations` with a JSON body. Express
matches it to `recommendationRoutes.js`, which runs the handler chain in order.

**2. `requireAuth(req, res, next)` runs.** It reads the `Authorization` header, extracts
the token after `Bearer `, and calls `supabase.auth.getUser(token)`. If there's no token
or Supabase rejects it, it responds `401 { error: 'You must be signed in' }` and the
request ends. Otherwise it calls `users.findByAuthUserId(...)` to load the app profile.
No profile → `401`. Success → it sets `req.user = profile` and calls `next()`.
*Why:* downstream code can now assume a valid, provisioned user.

**3. `validateRecommendationInput(req, res, next)` runs.** It reads `{ trip, members }`
from `req.body`.
   - It calls `validateTrip(trip)`. This checks `startTime`/`endTime` match `HH:MM`, that
     end is strictly after start (same-day only), that `maxBudgetPerPerson` is a
     non-negative number, and that `travelRadius` (if present) is a positive number. Any
     failure → `400` with a specific message.
   - It calls `validateMembers(members)`, which checks the array is non-empty and each
     member has a name, real `{ latitude, longitude }` coordinates, and (if present)
     string-array `interestTags`/`foodPrefs`/`diet`. Any failure → `400`.
   - On success it calls `next()`.
   *Why:* the engine receives only well-formed data, and each member's own prefs pass
   straight through untouched.

**4. `postRecommendations(req, res)` runs.** It destructures `{ trip, members }` from
`req.body` and calls `await getRecommendations(trip, members)` inside a `try/catch`.

**5. `getRecommendations(trip, members)` runs** (`services/recommendation/index.js`). It
computes `tripDate = trip?.tripDate ?? '2026-01-01'`. It calls `await getAllPins(tripDate)`.
*Why the date:* opening hours are per-weekday, so the engine must know which day it is.

**6. `getAllPins(tripDate)` runs** (`pinsRepository.js`). It calls
`prisma.pin.findMany()` — the single database read of the whole feature — returning every
row in the `Pin` table (~400 places). It maps each row through `mapVenue(pin, tripDate)`.
   - `mapVenue` returns the engine shape: `{ id, name, category, interests, cuisine,
     diet, rating, pricePerPerson, latitude, longitude, address, locationImageUrl,
     openingHours }`. It runs `interests`/`cuisines`/`diets` through `emptyToUndefined`
     (so `[]` becomes `undefined`), and resolves `openingHours` for the trip's weekday via
     `parseDayHours(pin.hoursOpen, dayKeyFromDate(tripDate))`.
   *Result:* an array of ~400 normalized pin objects.

**7. `recommend(trip, members, pins)` runs** (`recommend.js`). This is the pipeline:

   **7a.** It builds `groupTags = Set(all members' interestTags)` and
   `groupFood = Set(all members' foodPrefs)` — computed once and reused.

   **7b. `hardFilter(pins, members, trip, groupTags)`** — Stage 0 + 1. It first collects
   member coordinates and computes the raw `geometricMedian(coords)` (or `null` if no
   coords), then **snaps that to the nearest catalog pin** (`nearestPoint`) so the
   `meetingPoint` is always a real land venue rather than a spot that could fall in the
   water. Then, for each pin, it keeps the pin only if it passes *every* hard check:
   - **Relevance:** a restaurant passes if any member can eat there (`passesDiet`); an
     activity passes if its interests overlap the group's tags (`shareTag`) — or the group
     stated no interests at all (then all activities stay, ranked later by quality).
   - **Radius:** if a meeting point and `travelRadius` both exist, drop pins farther than
     the radius (`withinRadius`).
   - **Budget sanity:** drop only if a *single* visit already exceeds the whole per-person
     budget (`budgetSanityOk`); unknown price → keep.
   - **Closed that day:** if `openingHours === null` (known closed), hard-drop.
   - **Hours:** if the pin has usable hours but can't open in the window, drop; unknown or
     unparseable hours → keep and flag.
   - Survivors are shallow-copied with `priceUnknown`/`hoursUnknown` booleans attached.
   It returns `{ candidates, flags, meetingPoint, memberCoords }`.
   *Result:* the ~400 pins shrink to the eligible candidate pool (say, 60).

   **7c. `scoreAndSort(candidates, members, groupTags, groupFood)`** — maps each candidate
   to `{ ...pin, score: softScore(...) }` and sorts descending by score. *Result:* the 60
   candidates now each carry a 0–1 `score` and sit in best-first order.

   **7d. `enrichMissing(scoredCandidates.slice(0, ENRICHMENT_POOL_SIZE))`** — today a
   no-op returning the top 40 unchanged. (When implemented, it would improve their data
   and require a re-score.)

   **7e. `computeShortlistSize(trip)`** — turns the time window into a target count. E.g. a
   9-hour day at 90 min/stop = 6 stops × 3 = 18, floored at `FOOD_MIN` (6).

   **7f. `assembleWithFoodQuota(rankedTop, scoredCandidates, shortlistSize)`** — walks the
   ranked list adding pins up to `shortlistSize`, but stops adding restaurants once
   `FOOD_MAX` (10) is reached. If fewer than `FOOD_MIN` (6) restaurants made it, it
   floor-fills from the best-rated remaining restaurants in the full pool. *Result:* a
   balanced shortlist (activities-led, guaranteed meal options).

   **7g. `ensureEveryMemberCovered(assembled, members, scoredCandidates)`** — for each
   member with nothing they'd like in the shortlist, it injects their best-scoring matching
   candidate. *Result:* every member is represented (when data allows).

   **7h. `ensureEveryDietCovered(covered, members, scoredCandidates)`** — for each member
   with a dietary restriction and no edible restaurant in the shortlist, it injects their
   best-scoring edible restaurant. *Result:* the final `shortlist`.

   **7i.** It computes `maxMemberDistance` (worst-off member's travel to the meeting point)
   and `foodBelowMin` (are there fewer than `FOOD_MIN` restaurants?), then returns
   `{ shortlist, constraints: { maxBudgetPerPerson, groupSize, startingCoordinates,
   timeWindow, transport, meetingPoint, travelRadius, maxMemberDistance, foodBelowMin } }`.

**8. Back in the controller.** If `result.shortlist.length === 0`, it responds `200` with
`{ ...result, reason: emptyReason(trip) }` (a friendly explanation). Otherwise it responds
`200` with `result`. If anything threw, the `catch` logs it and responds
`500 { error: 'Failed to generate recommendations' }`.

**9. Response returns to the client**, which passes the shortlist + constraints on to the
AI sequencing step.

---

## 5. Data Flow

Tracking how the data physically changes shape at each stage:

```
INPUT (HTTP body)
   trip:    { startTime:'09:00', endTime:'18:00', maxBudgetPerPerson:60, travelRadius:5 }
   members: [ {name, startLocation:{lat,lng}, interestTags[], foodPrefs[], diet[]}, ... ]
        │
        ▼
VALIDATION  (validateRecommendationInput)
   • guarantees types/ranges are valid (trip + each member)
   Shape out: the same `members` array, now trusted (each member's own prefs).
        │
        ▼
DB LOAD + MAP  (getAllPins → mapVenue)
   Pin rows (~400)  →  engine pins:
   { id, name, category, interests|undefined, cuisine|undefined, diet|undefined,
     rating|undefined, pricePerPerson, latitude, longitude, openingHours:[{open,close}]|null|undefined }
        │
        ▼
FILTERING  (hardFilter)
   ~400 pins  →  ~60 candidates
   Each survivor gains: priceUnknown, hoursUnknown flags.
   Also produces: meetingPoint, memberCoords.
   (Ineligible pins — wrong diet, over budget, closed, too far — are gone.)
        │
        ▼
SCORING  (scoreAndSort → softScore)
   Each candidate gains: score ∈ [0,1].
   Shape: [ { ...pin, priceUnknown, hoursUnknown, score }, ... ]
        │
        ▼
SORTING  (same step, .sort by score desc)
   Same objects, now ordered best-first.
        │
        ▼
ASSEMBLY  (assembleWithFoodQuota)
   ~60 sorted candidates  →  ~18 shortlist entries
   Balanced: activities-led, restaurants capped at FOOD_MAX, floor-filled to FOOD_MIN.
        │
        ▼
FAIRNESS  (ensureEveryMemberCovered → ensureEveryDietCovered)
   Shortlist may gain a few injected pins so no member / dieted member is left out.
        │
        ▼
FINAL RESPONSE
   { shortlist: [ {id,name,category,...,score}, ... ],
     constraints: { maxBudgetPerPerson, groupSize, startingCoordinates, timeWindow,
                    transport, meetingPoint, travelRadius, maxMemberDistance, foodBelowMin } }
   (Controller may add `reason` if shortlist is empty.)
```

The key transformations: `Pin row → engine pin` (mapping), `all pins → candidates`
(filtering removes rows and adds flags), `candidates → scored candidates` (scoring adds a
number), and `scored candidates → shortlist` (assembly + fairness selects and balances).
Note the `members` array itself is *not* transformed — it passes through validation
unchanged, so each member's own prefs reach the engine intact.

---

## 6. Recommendation Logic

The ranking is a single weighted score on a **0–1 scale**, computed in
`score/score.js`'s `softScore`. Both activities and restaurants land on the same scale so
they rank together in one list. The score is:

```
score = 0.5 × coverage  +  0.3 × intensity  +  0.2 × quality
        (WEIGHTS.coverage)  (WEIGHTS.intensity)  (WEIGHTS.quality)
```

Those three weights live in `config/recommendation.js` and **must sum to 1** (so the final
score always stays in `[0,1]`).

### Rule 1 — Coverage (weight 0.5, the largest)
**What's scored:** the fraction of group members who would "like" this pin. `coverage =
(members who like it) / (total members)`.
**What "like" means:** for a restaurant, the member's food prefs overlap the pin's cuisine
*and* the member can eat there (diet); for an activity, the member's interests overlap the
pin's tags. This is `memberLikes`.
**Why it affects the score:** NavQuest is a *group* product. A place liked by everyone is
better for the group than a place adored by one person. Coverage is the fairness signal,
so it gets the heaviest weight.
**How it changes ranking:** a restaurant everyone can eat at and enjoys floats to the top;
one that excludes half the group sinks.
**Example:** In a 4-person group, a taco place liked by 3 → coverage 0.75. A niche
oyster bar liked by 1 → coverage 0.25. All else equal, the taco place ranks far higher.

### Rule 2 — Intensity (weight 0.3)
**What's scored:** how *strongly* the pin matches the group's combined tastes —
`intensity = min(1, matchCount / INTENSITY_SATURATION)`, where `matchCount` is how many of
the group's tags/cuisines the pin hits, and `INTENSITY_SATURATION = 3`.
**Why it affects the score:** coverage says "how many people," intensity says "how deep the
match is" regardless of who. A place tagged `hiking, nature, viewpoint` for an outdoorsy
group is a stronger fit than one that just clips a single tag.
**Why it saturates:** the `min(1, …/3)` caps the reward at 3 matches. Without a cap, a pin
tagged with everything would win forever just by piling on tags. Saturation says "3 solid
matches is already a great fit; more doesn't keep helping."
**Example:** a museum tagged `art, history, culture` for a group into all three →
matchCount 3 → intensity `min(1, 3/3) = 1.0` (maxed). A museum matching only `art` →
intensity `1/3 ≈ 0.33`.

### Rule 3 — Quality (weight 0.2, the smallest)
**What's scored:** the pin's rating, normalized: `quality = rating / 5`, or
`QUALITY_DEFAULT = 0.6` when the pin is unrated.
**Why it affects the score:** among places that match the group equally well, the
higher-rated one should win. It's the smallest weight because a great rating shouldn't
override a poor fit for the group.
**Why the default is 0.6, not 0:** `0.6 ≈ 3/5`, a neutral "we don't know." If unrated pins
scored 0 on quality, missing data would unfairly bury them — violating the engine's core
"missing data must never punish a pin" rule.
**Example:** two equally-matched cafés, one rated 4.5 (quality 0.9) and one unrated
(quality 0.6). The rated one edges ahead, but only slightly, because quality is weighted
just 0.2.

### Why filtering happens *before* scoring
Scoring is only meaningful for places the group *could actually go to*. There's no point
ranking a restaurant nobody in the group can eat at, a place outside the travel radius, or
one that's closed. Filtering first (`hardFilter`) removes the ineligible pins so scoring
operates on a clean, valid pool — and so we never waste scoring effort or risk surfacing
an impossible option.

### The "missing data → keep, don't punish" principle (very important)
This rule runs through the whole engine and is the #1 thing to internalize:

- Unknown **price** → keep the pin (don't drop for budget), flag `priceUnknown`.
- Unknown **hours** → keep the pin, flag `hoursUnknown`. Only *known-closed* (`null`) is a
  hard drop.
- Unknown **diet/cuisine** (`undefined`) → assume the pin *can* serve/match (keep it).
- Unrated → neutral quality 0.6, not 0.

This is why `mapVenue` so carefully converts `[]` to `undefined`: an empty array would read
as "confirmed serves nothing / matches nothing" (and wrongly drop the pin), whereas
`undefined` reads as "we don't know" (keep it). The seed catalog is incomplete, so
punishing missing data would empty the shortlist.

### Normalization
Every sub-score is normalized to `[0,1]` before weighting: coverage is a fraction,
intensity is capped at 1 via saturation, quality is `rating/5`. Because the weights sum to
1, the final score is also in `[0,1]`, which keeps activities and restaurants directly
comparable on one list.

### The food quota (a ranking override in assembly)
Pure score-sorting could yield an all-restaurant or no-restaurant shortlist. So
`assembleWithFoodQuota` overrides pure ranking with two guardrails: cap restaurants at
`FOOD_MAX = 10` (activities lead the day), and guarantee at least `FOOD_MIN = 6` meal
options (floor-fill from best-rated remaining restaurants if ranking alone didn't produce
enough). Treats like coffee/dessert are *not* restaurants (different category), so they
don't count against the quota — they're just activities the user picked.

---

## 7. Database Usage

The recommendation engine performs exactly **one** database query.

### Query: `prisma.pin.findMany()` (in `pinsRepository.getAllPins`)
**Why it exists:** the engine needs the full catalog of candidate places to filter and
rank. There's no per-user filtering at the DB level — pins are now a shared *venue catalog*
(not per-itinerary stops), so every pin is a legitimate candidate.
**Table queried:** `Pin`.
**Fields used** (from the schema): `id`, `name`, `category`, `interests[]`, `cuisines[]`,
`diets[]`, `rating`, `pricePerPerson`, `latitude`, `longitude`, `address`,
`locationImageUrl`, `hoursOpen` (JSON). Each maps to a field the engine needs:
`category`/`interests`/`cuisines`/`diets` drive relevance & scoring; `pricePerPerson`
drives budget; `latitude`/`longitude` drive the meeting point + radius; `hoursOpen` drives
the open-in-window check; `rating` drives quality.
**Indexes:** this is a full-table scan by design — the query has **no `WHERE` clause**, so
no index helps or is needed. The `Pin` table has only its primary key (`id`) and no
secondary indexes. That's acceptable because the catalog is small (~400 rows) and the read
happens once per generation.
**Expected complexity:** `O(N)` in the number of pins for the DB read (~400 rows). The
engine's in-memory work is then roughly `O(pins × members)` for scoring (each pin checked
against each member), which at ~400 pins × a handful of members is trivial. The geometric
median is `O(iterations × members)` and also negligible.

### A historical note (privacy)
Older versions read pins that belonged to itineraries and had to filter out private
drafts (the "Hawk Hill" privacy bug — a private pin leaking into strangers'
recommendations). After the Pin/ItineraryStop split, pins are standalone venue definitions
with no owner, so **no privacy filter is needed anymore** — that's why `getAllPins` has no
`where` clause. If you ever re-associate pins with users, you must reintroduce a privacy
filter here.

---

## 8. Design Decisions

**One ranked list with a food quota, not two separate lists.** Rather than ranking
restaurants and activities separately, both are scored on the same 0–1 scale and merged
into one list, with a quota balancing the mix. *Why:* it lets a genuinely great restaurant
outrank a mediocre activity (and vice versa) instead of artificially separating them.
*Tradeoff:* we need the quota logic to prevent one category from dominating.

**Pure engine + one I/O seam.** Everything under `recommend()` is a pure function; only
`services/recommendation/index.js` touches the DB. *Why:* the entire ranking pipeline is
unit-testable with plain objects, and the logic can't accidentally issue queries mid-rank.
*Tradeoff:* all data must be loaded up front (the full catalog), which is fine at ~400
rows but wouldn't scale to millions without a pre-filtering query.

**Missing data keeps a pin (never punishes it).** *Why:* the catalog is hand-seeded and
incomplete; dropping or zero-scoring pins with unknown price/hours/diet would empty the
shortlist. *Alternative rejected:* treating unknown as "fails the constraint" — that was
tried implicitly and produced empty results. *Tradeoff:* occasionally a pin with truly bad
(but unknown) data survives; it's flagged (`priceUnknown`/`hoursUnknown`) so the AI/frontend
can note the uncertainty.

**Geometric median for the meeting point, not the average (centroid).** *Why:* the average
is dragged toward a single far-away member, which is exactly the unfairness we want to
avoid. The geometric median minimizes the *total* travel distance and resists outliers.
*Alternative rejected:* plain centroid (used only as the algorithm's starting seed).
*Tradeoff:* it's iterative (Weiszfeld's algorithm), but bounded by
`MEETING_POINT_MAX_ITERATIONS` so cost is negligible.

**Snap the meeting point to the nearest catalog pin.** *Why:* the raw geometric median of
members on opposite shores (e.g. across the bay) can land *in the water* — a useless anchor
with nothing to stand on and meaningless "nearby" venues. Snapping to the closest real pin
guarantees the anchor is on land and genuinely central to the group. *Alternatives
rejected:* leaving the raw median (radius filtering still works over water, but the anchor
can be arbitrary); or a coastline/land dataset or geocoding lookup (accurate but adds a
dependency + network cost). Snapping needs no external data — every pin is already a real
land venue — so it's deterministic and free. *Tradeoff:* the anchor is a nearby venue
rather than the exact mathematical center, which is fine (it's only used to filter by
radius and report group travel distance, not as a destination).

**Coverage weighted highest (0.5).** *Why:* this is a group product; fairness to the whole
group matters more than any single signal. Quality is weighted lowest (0.2) so a great
rating can't rescue a poor group fit. *Tradeoff:* a spectacular but niche place will rank
low even if it's objectively excellent — intentional.

**All tunables in config.** Weights, quotas, and thresholds live in
`config/recommendation.js`. *Why:* product behavior is tuned by editing config, not logic,
which keeps changes safe and reviewable.

**`Pin` doubles as the place catalog (no separate `Place` table).** *Why:* a team decision
to avoid a schema migration risking conflicts; `Pin` already carried the needed fields.
*Tradeoff:* some engine concepts (cuisine/diet/hours) had to be added or derived on `Pin`.

**Empty shortlist is a `200`, not an error.** The controller returns `200` with a `reason`
string. *Why:* "no places matched your very tight constraints" is a normal, expected
outcome the user should see explained — not a server error. It also prevents an empty
shortlist from flowing into the AI step (which would `400`).

---

## 9. Error Handling

**Authentication failures** — no/invalid token, or no matching profile → `requireAuth`
returns `401 { error: 'You must be signed in' }`. The controller never runs.

**Validation failures** — malformed `trip` or `members` →
`validateRecommendationInput` returns `400` with a *specific* message (e.g.
`"trip.endTime must be later than trip.startTime (same-day trips only)"` or
`"members[2].startLocation is required and must be { latitude, longitude } coordinates"`).
The engine never runs on bad data.

**Empty shortlist (not an error)** — if the engine returns zero matches (tight radius, low
budget, thin catalog for the interests), the controller returns `200` with a `reason`
picked by `emptyReason(trip)`: it blames the travel radius first, then a very low budget,
otherwise gives a generic "add interests / raise budget / widen the window" hint. This is a
deliberate UX choice so the frontend can guide the user instead of showing a blank screen.

**Engine / DB failures** — if `getRecommendations` throws (DB unreachable, a bug deep in
the pipeline), the controller's `try/catch` logs the raw error server-side
(`console.error`) and returns `500 { error: 'Failed to generate recommendations' }`.
*Why:* without this, the error would fall through to Express's default handler, which
returns an HTML page the JSON-parsing frontend can't read.

**Edge cases handled inside the engine:**
- *Empty group* → `softScore` guards `members.length > 0` so coverage isn't `0/0 = NaN`
  (a single NaN would poison the whole sort).
- *No group interests at all* → `hardFilter` keeps all activities (ranked by quality)
  rather than filtering every activity out and leaving a meals-only shortlist.
- *No member coordinates* → meeting point is `null` and the radius filter is skipped
  (the engine behaves as if there were no radius).
- *Unparseable/missing hours* → treated as unknown (kept + flagged), never dropped; only
  explicit `null` (known-closed that day) is a hard drop.
- *Very short time window* → `computeShortlistSize` still returns at least `FOOD_MIN`, so
  the shortlist is never too small to hold the meal floor.
- *No edible restaurant for a dieted member* → `ensureEveryDietCovered` simply can't
  inject one (a real data gap); it doesn't crash, it just leaves the gap for the
  frontend/AI to surface.

---

## 10. Example Walkthrough

**The request.** Three friends want a Saturday out. The wizard sends:

```json
{
  "trip": { "startTime": "10:00", "endTime": "19:00", "maxBudgetPerPerson": 50, "travelRadius": 4 },
  "members": [
    { "name": "Ana",  "startLocation": {"latitude": 37.78, "longitude": -122.41},
      "interestTags": ["art", "museum"], "foodPrefs": ["italian"], "diet": [] },
    { "name": "Ben",  "startLocation": {"latitude": 37.76, "longitude": -122.43},
      "interestTags": ["museum", "history"], "foodPrefs": ["italian", "mexican"], "diet": [] },
    { "name": "Cai",  "startLocation": {"latitude": 37.80, "longitude": -122.40},
      "interestTags": ["hiking"], "foodPrefs": ["mexican"], "diet": ["vegetarian"] }
  ]
}
```

**Stage: auth + validation.** `requireAuth` confirms the caller is signed in and sets
`req.user`. `validateRecommendationInput` validates every field — times are valid and
19:00 > 10:00, budget 50 ≥ 0, radius 4 > 0, all coordinates in range, and each member's own
prefs are string arrays — and calls `next()`. The three members keep their independent
prefs (Ana: art/italian, Ben: history/italian+mexican, Cai: hiking/mexican+vegetarian).
The controller calls `getRecommendations(trip, members)`.

**Stage: DB load.** `getAllPins('2026-01-01')` reads ~400 Pin rows and maps each to the
engine shape. Say the catalog includes an art museum, a history museum, a hiking viewpoint,
two Italian restaurants, a vegetarian-friendly Mexican taqueria, a meat-only Mexican grill,
a place across town (6 miles away), and a café that's closed Saturdays.

**Stage: group sets.** `recommend` builds
`groupTags = {art, museum, history, hiking}` and `groupFood = {italian, mexican}`.

**Stage: hardFilter.**
- Meeting point = geometric median of the three coordinates → roughly the center of the
  city cluster.
- The place 6 miles away is **dropped** (outside the 4-mile radius).
- The Saturday-closed café is **dropped** (`openingHours === null` that day).
- The meat-only Mexican grill: `passesDiet` checks if *any* member can eat there — Ana and
  Ben have no diet, so it **passes** the filter (it stays; diet fairness is handled later).
- The vegetarian taqueria, both Italian restaurants, the art museum, history museum, and
  hiking viewpoint all pass relevance, radius, budget, and hours.
- Survivors (say 6 candidates) each get `priceUnknown: false`, `hoursUnknown: false`.

**Stage: score + sort.** `softScore` runs on each survivor. A sketch:

| Place | coverage | intensity | quality | score = .5c + .3i + .2q |
|---|---|---|---|---|
| Vegetarian taqueria (mexican) | Ben+Cai like it, Cai can eat = 2/3 ≈ 0.67 | 1 cuisine match → 0.33 | 4.6/5 = 0.92 | **0.62** |
| Art museum (art, culture) | Ana likes = 1/3 ≈ 0.33 | 1 tag → 0.33 | 4.4/5 = 0.88 | 0.44 |
| History museum (museum, history) | Ana+Ben = 2/3 ≈ 0.67 | 2 tags → 0.67 | 4.2/5 = 0.84 | **0.70** |
| Italian bistro | Ana+Ben = 2/3 ≈ 0.67 | 1 cuisine → 0.33 | 4.0/5 = 0.80 | 0.59 |
| Italian trattoria | Ana+Ben = 2/3 ≈ 0.67 | 1 → 0.33 | unrated → 0.60 | 0.56 |
| Hiking viewpoint | Cai = 1/3 ≈ 0.33 | 1 → 0.33 | unrated → 0.60 | 0.39 |
| Meat-only Mexican | Ben likes, Cai can't eat = 1/3 ≈ 0.33 | 1 → 0.33 | 4.1/5 = 0.82 | 0.43 |

Sorted best-first: history museum (0.70), taqueria (0.62), Italian bistro (0.59), Italian
trattoria (0.56), art museum (0.44), meat Mexican (0.43), hiking viewpoint (0.39).

**Stage: assembly.** `computeShortlistSize`: window = 9h = 540 min ÷ 90 = 6 stops × 3 = 18
(floored at 6). Our pool is only 7, so all fit. `assembleWithFoodQuota` walks the sorted
list; restaurants (taqueria, both Italians, meat Mexican) are well under `FOOD_MAX = 10`,
so nothing is capped. Food count = 4, which is below `FOOD_MIN = 6`, but there are no more
restaurants in the pool to floor-fill with — so it stops (a thin-catalog reality, surfaced
later as `foodBelowMin: true`).

**Stage: fairness.** `ensureEveryMemberCovered` checks each member:
- Ana likes the history museum and Italians → covered.
- Ben likes the history museum, taqueria, Italians → covered.
- Cai likes the taqueria (mexican, and Cai can eat there) and the hiking viewpoint → the
  viewpoint is already in the list → covered.
No injection needed. `ensureEveryDietCovered` checks Cai (vegetarian): the vegetarian
taqueria is in the shortlist and Cai can eat there → covered. Ana/Ben have no diet → skip.

**Final response:**

```json
{
  "shortlist": [
    { "name": "History Museum", "category": "activity", "score": 0.70, ... },
    { "name": "Veggie Taqueria", "category": "restaurant", "score": 0.62, ... },
    { "name": "Italian Bistro", "category": "restaurant", "score": 0.59, ... },
    { "name": "Italian Trattoria", "category": "restaurant", "score": 0.56, ... },
    { "name": "Art Museum", "category": "activity", "score": 0.44, ... },
    { "name": "Meat Mexican Grill", "category": "restaurant", "score": 0.43, ... },
    { "name": "Hiking Viewpoint", "category": "activity", "score": 0.39, ... }
  ],
  "constraints": {
    "maxBudgetPerPerson": 50,
    "groupSize": 3,
    "startingCoordinates": [ {"latitude":37.78,...}, ... ],
    "timeWindow": { "startTime": "10:00", "endTime": "19:00" },
    "transport": null,
    "meetingPoint": { "latitude": 37.78, "longitude": -122.41 },
    "travelRadius": 4,
    "maxMemberDistance": 1.6,
    "foodBelowMin": true
  }
}
```

The AI sequencing step then takes this and builds the actual timed schedule.

---

## 11. Key Takeaways

### Important concepts
- The engine turns **a group + constraints** into **a ranked, balanced, fair shortlist** —
  it does *not* build the schedule (that's the AI step).
- **Filter, then score, then assemble, then guarantee fairness** — in that order, always.
- The whole pipeline is **pure** except one DB read in `services/recommendation/index.js`.
- **Missing data keeps a pin, never punishes it.** This single rule explains most of the
  helper logic and the `[]`-to-`undefined` mapping.
- Score = `0.5 coverage + 0.3 intensity + 0.2 quality`, all normalized to `[0,1]`, weights
  sum to 1.

### Common mistakes to avoid
- **Returning `[]` instead of `undefined`** for unknown cuisine/diet — this silently drops
  pins. Always funnel through `emptyToUndefined` (see `mapVenue`).
- **Making the weights not sum to 1** — the score leaves `[0,1]` and rankings get
  distorted. Keep the invariant.
- **Calling Prisma from inside the pure engine** — it breaks testability. All DB access
  stays in `index.js`/`pinsRepository`.
- **Treating an empty shortlist as an error** — it's a normal `200` with a `reason`.
- **Adding a `where` clause that filters pins by owner** without realizing pins are now
  ownerless venues (would silently return nothing).

### If you want to add a new recommendation *factor* (a new scoring signal)
1. Add its weight to `WEIGHTS` in `config/recommendation.js` and **rebalance so all weights
   still sum to 1**.
2. Compute the new normalized `[0,1]` sub-score in `softScore` (`score/score.js`) and add
   its weighted term to the total.
3. If it needs a new field on the pin, add it to the `Pin` schema, the seed data, and
   `mapVenue.js` so the engine actually receives it.
4. Add/extend tests in `score/score.test.js`.

### If you want to change *ranking* (how things are ordered)
- Tune the numbers in `config/recommendation.js` (`WEIGHTS`, `INTENSITY_SATURATION`,
  `QUALITY_DEFAULT`) for a behavior change without touching logic.
- Change the formula itself in `score/score.js` (`softScore`).
- Change the *sort* or the shortlist size/mix in `recommend.js` (`scoreAndSort`) and
  `assemble/assemble.js` (`computeShortlistSize`, `FOOD_MIN`/`FOOD_MAX`).

### If you want to change *filtering* (what's eligible)
- Add or change a hard constraint in `filters/filters.js` (`hardFilter`) — this is where
  pins are dropped.
- The underlying predicates live in `helpers/helpers.js` (`passesDiet`, `budgetSanityOk`,
  `isOpenInWindow`, `withinRadius`, `isClosedThisDay`, …) — change the *rule* there.
- Radius/meeting-point behavior lives in `utils/geo.js` and the Stage 0 block of
  `hardFilter`.
- Remember the golden rule: only drop a pin for a **real, known** constraint failure;
  unknown data must be kept (and flagged), never dropped.
```
