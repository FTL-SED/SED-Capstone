# Radius-aware Add Stop + Map Circle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filter the Add Stop catalog search to venues within the group's travel radius (showing each result's distance), and draw a translucent radius circle plus muted out-of-radius markers on the itinerary map.

**Architecture:** Everything rides on data that already exists and is already returned to the owner — `travelRadius` (miles) and `meetingPointLat/Lng` on the itinerary. Backend adds optional `lat`/`lng`/`radius` query params to `GET /stops`, filtering results with a pure, unit-tested helper. Frontend derives `meetingPoint` + `radiusMi` from the itinerary response and threads them into `AddStopPanel` (distance-aware search) and `MapView` (Leaflet `<Circle>` + muted markers). No schema change.

**Tech Stack:** Node ESM + Express 5 + Prisma (backend), `node:test`; React 19 + react-leaflet/Leaflet + axios (frontend), plain co-located CSS with `:root` design tokens.

## Global Constraints

- Backend is ESM: `import`/`export` with `.js` extensions in import paths.
- All DB access goes through a model; controllers/services never call `prisma` directly.
- Only `lib/`/`config/` read `process.env` — not relevant here (no new env).
- `process.env` and `req`/`res` stay out of models and pure helpers.
- Tests are co-located `*.test.js` using `node:test` + `node:assert/strict`; only pure/service logic is unit-tested (routes/controllers/components are verified manually).
- Frontend styling: plain co-located CSS, BEM-ish class names, existing `:root` tokens. Teal accent `--accent #0d9488`, `--accent-strong #0f766e`; muted text `--slate-500 #64748b` / `--slate-600 #475569`; `--surface #ffffff`; `--border #e2e8f0`; `--radius-sm 6px`; `--shadow-sm`. No new CSS/JS libraries.
- Frontend `CLAUDE.md`: do not create/rename/move files beyond what this plan specifies.
- Git rules: no `Co-Authored-By` trailer; imperative subject ≤50 chars; never commit to `main` (work stays on `dylan-itinerary-quality`).
- Behavior is strictly additive: when `travelRadius` is blank/≤0 OR the meeting point is missing, Add Stop and MapView behave exactly as they do today.
- The meeting point is owner-only (`OWNER_ONLY_FIELDS` in `backend/models/itineraries.js`); the radius circle therefore renders for the owner only. This is intended, not a gap.

---

### Task 1: Pure distance-filter helper for the catalog search

Add a pure function that filters an array of venue rows to those within a radius of a center point and annotates each survivor with `distanceMi`. Keeping the logic pure makes it unit-testable without a DB (matching the repo convention that models call pure helpers and only the helpers are tested).

**Files:**
- Modify: `backend/models/pins.js`
- Test: `backend/models/pins.test.js` (create)

**Interfaces:**
- Consumes: `haversineMiles(a, b)` from `backend/utils/geo.js` — both args are `{ latitude, longitude }` in decimal degrees, returns miles.
- Produces: `filterByRadius(rows, { lat, lng, radius })` — exported from `backend/models/pins.js`. `rows` is an array of objects with numeric `latitude`/`longitude`. Returns a new array of the rows within `radius` miles of `{ latitude: lat, longitude: lng }`, each shallow-cloned with an added `distanceMi` (number, rounded to 1 decimal). Rows missing numeric coordinates are dropped. Order of surviving rows is preserved.

- [ ] **Step 1: Write the failing test**

Create `backend/models/pins.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterByRadius } from './pins.js'

// Ferry Building ~ Coit Tower is ~0.8 mi; Ferry Building ~ Golden Gate Park is ~4.5 mi.
const FERRY = { latitude: 37.7955, longitude: -122.3937 }
const rows = [
  { id: 1, name: 'Coit Tower', latitude: 37.8024, longitude: -122.4058 },
  { id: 2, name: 'GG Park', latitude: 37.7694, longitude: -122.4862 },
  { id: 3, name: 'No Coords', latitude: null, longitude: null },
]

test('filterByRadius keeps in-radius rows and annotates distanceMi', () => {
  const out = filterByRadius(rows, { lat: FERRY.latitude, lng: FERRY.longitude, radius: 2 })
  assert.equal(out.length, 1)
  assert.equal(out[0].id, 1)
  assert.equal(typeof out[0].distanceMi, 'number')
  assert.ok(out[0].distanceMi > 0 && out[0].distanceMi < 2)
  // rounded to 1 decimal place
  assert.equal(out[0].distanceMi, Math.round(out[0].distanceMi * 10) / 10)
})

test('filterByRadius includes rows within a larger radius', () => {
  const out = filterByRadius(rows, { lat: FERRY.latitude, lng: FERRY.longitude, radius: 6 })
  assert.deepEqual(out.map((r) => r.id), [1, 2])
})

test('filterByRadius drops rows with missing coordinates', () => {
  const out = filterByRadius(rows, { lat: FERRY.latitude, lng: FERRY.longitude, radius: 100 })
  assert.equal(out.find((r) => r.id === 3), undefined)
})

test('filterByRadius does not mutate the input rows', () => {
  filterByRadius(rows, { lat: FERRY.latitude, lng: FERRY.longitude, radius: 2 })
  assert.equal('distanceMi' in rows[0], false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && node --test models/pins.test.js`
Expected: FAIL — `filterByRadius` is not exported / not a function.

- [ ] **Step 3: Write minimal implementation**

In `backend/models/pins.js`, add the import at the top (after the existing `prisma` import):

```js
import { haversineMiles } from '../utils/geo.js'
```

Add the helper (above `export`):

```js
// Pure: keep only rows within `radius` miles of { lat, lng }, annotating each
// survivor with distanceMi (1 decimal). Rows without numeric coordinates are
// dropped — they can't be shown as "within radius". Does not mutate inputs.
function filterByRadius(rows, { lat, lng, radius }) {
  const center = { latitude: lat, longitude: lng }
  return rows.reduce((acc, row) => {
    if (typeof row.latitude !== 'number' || typeof row.longitude !== 'number') return acc
    const miles = haversineMiles(row, center)
    if (miles <= radius) acc.push({ ...row, distanceMi: Math.round(miles * 10) / 10 })
    return acc
  }, [])
}
```

Update the export line to include it:

```js
export { findById, findMany, create, filterByRadius }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && node --test models/pins.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/models/pins.js backend/models/pins.test.js
git commit -m "Add pure radius filter helper for catalog search"
```

---

### Task 2: Wire `lat`/`lng`/`radius` params through `GET /stops`

Make the catalog search endpoint apply the radius filter when the three geo params are supplied, validating them all-or-none. The model gains an optional radius pass; the controller does HTTP validation.

**Files:**
- Modify: `backend/models/pins.js` (`findMany`)
- Modify: `backend/controllers/stopController.js` (`searchCatalog`)

**Interfaces:**
- Consumes: `filterByRadius(rows, { lat, lng, radius })` from Task 1.
- Produces: `findMany({ q, category, take, skip, geo })` — `geo` is optional `{ lat, lng, radius }` (finite numbers, `radius > 0`); when present, results are radius-filtered and each carries `distanceMi`. `GET /stops` accepts optional query params `lat`, `lng`, `radius`; supplying any one requires all three (else `400`).

- [ ] **Step 1: Extend `findMany` to accept and apply `geo`**

In `backend/models/pins.js`, change `findMany` so it optionally applies the radius filter after fetching. Replace the current `findMany` body:

```js
function findMany({ q, category, take = 20, skip = 0, geo } = {}) {
  const where = {}
  if (q) where.name = { contains: q, mode: 'insensitive' }
  if (category) where.category = category
  return prisma.pin
    .findMany({
      where,
      orderBy: [{ rating: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
      take,
      skip,
    })
    .then((rows) => (geo ? filterByRadius(rows, geo) : rows))
}
```

Note: `filterByRadius` is defined in the same file (Task 1), so no new import.

- [ ] **Step 2: Validate params and pass `geo` in the controller**

In `backend/controllers/stopController.js`, replace the body of `searchCatalog` (lines ~12-25) with:

```js
async function searchCatalog(req, res) {
  const { q, category } = req.query
  const limit = Math.min(Number(req.query.limit) || 20, 50)
  const offset = Math.max(Number(req.query.offset) || 0, 0)

  // Geo filter is all-or-none: supplying any of lat/lng/radius requires all
  // three, each finite, with radius > 0. Absent → unfiltered (today's behavior).
  const rawGeo = [req.query.lat, req.query.lng, req.query.radius]
  const geoProvided = rawGeo.some((v) => v !== undefined)
  let geo
  if (geoProvided) {
    const [lat, lng, radius] = rawGeo.map(Number)
    const allFinite = [lat, lng, radius].every(Number.isFinite)
    if (!allFinite || radius <= 0) {
      return res.status(400).json({ error: 'lat, lng, and radius must all be provided as numbers with radius > 0' })
    }
    geo = { lat, lng, radius }
  }

  const venues = await pins.findMany({
    q: typeof q === 'string' && q.trim() ? q.trim() : undefined,
    category: category === 'restaurant' || category === 'activity' ? category : undefined,
    take: limit,
    skip: offset,
    geo,
  })

  return res.status(200).json(venues)
}
```

Also update the doc comment above `searchCatalog` to mention the new params. Change the existing comment line listing params to:

```js
// their itinerary. Query params: q (name search), category (restaurant|activity),
// limit, offset, and optional lat/lng/radius (miles) to filter to venues within
// the group's travel radius — supplied all-or-none; each result then carries
// distanceMi. Returns an array of catalog venues (Pins). Auth via requireAuth.
```

- [ ] **Step 3: Run the existing backend test suite**

Run: `cd backend && node --test`
Expected: PASS — all existing tests plus Task 1's 4 tests still green (no test touches the DB; `findMany`'s change is covered by the pure helper).

- [ ] **Step 4: Manually verify the endpoint (server running)**

Start the backend (`cd backend && npm start`) and, with a valid bearer token, hit:
- `GET /stops?q=park` → 200, array, no `distanceMi` fields.
- `GET /stops?lat=37.7955&lng=-122.3937&radius=1` → 200, every row has `distanceMi <= 1`.
- `GET /stops?lat=37.7955&lng=-122.3937` (missing radius) → `400 { error }`.
- `GET /stops?lat=37.7955&lng=-122.3937&radius=0` → `400 { error }`.

Record the observed status codes in the commit body if any differ from expected.

- [ ] **Step 5: Commit**

```bash
git add backend/models/pins.js backend/controllers/stopController.js
git commit -m "Filter catalog search by travel radius"
```

---

### Task 3: Derive meetingPoint + radiusMi and thread them to the panels

Read the (owner-only) meeting point and radius from the itinerary response and pass them down to `AddStopPanel` (via `WrittenItinerary`) and `MapView`. No behavior change yet — this only wires props.

**Files:**
- Modify: `frontend/src/pages/ItineraryPage/ItineraryPage.jsx`
- Modify: `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx`
- Modify: `frontend/src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.jsx`

**Interfaces:**
- Consumes: `itinerary.travelRadius` (number|null, miles), `itinerary.meetingPointLat` / `itinerary.meetingPointLng` (number|null) from the `GET /itineraries/:id` response.
- Produces: two derived values in `ItineraryPage` — `meetingPoint` (`{ lat, lng } | null`) and `radiusMi` (`number | null`). The prop chain is `ItineraryPage → ItineraryPanel → WrittenItinerary → AddStopPanel` (mirroring how `onAddStop` already flows), plus `ItineraryPage → MapView` directly. `AddStopPanel` and `MapView` each gain props `meetingPoint`, `radiusMi`; `ItineraryPanel` and `WrittenItinerary` forward them.

- [ ] **Step 1: Derive the values in `ItineraryPage`**

In `frontend/src/pages/ItineraryPage/ItineraryPage.jsx`, after `itinerary` is available (near where `handleAddStop` is defined, before the render return), add:

```jsx
// Owner-only meeting point + optional travel radius drive the Add Stop distance
// filter and the map's radius circle. Both must be present/positive to apply;
// otherwise the UI degrades to its no-radius behavior.
const meetingPoint =
  typeof itinerary.meetingPointLat === 'number' && typeof itinerary.meetingPointLng === 'number'
    ? { lat: itinerary.meetingPointLat, lng: itinerary.meetingPointLng }
    : null;
const radiusMi = typeof itinerary.travelRadius === 'number' && itinerary.travelRadius > 0
  ? itinerary.travelRadius
  : null;
```

- [ ] **Step 2: Pass props to `MapView` and into the `ItineraryPanel` chain**

In the same file, update the `MapView` usage (currently `<MapView pins={itinerary.pins} />`):

```jsx
<MapView pins={itinerary.pins} meetingPoint={meetingPoint} radiusMi={radiusMi} />
```

In the `<ItineraryPanel ... />` render (the block that already passes `onAddStop={handleAddStop}`), add the two props next to `onAddStop`:

```jsx
meetingPoint={meetingPoint}
radiusMi={radiusMi}
```

- [ ] **Step 3: Forward props through `ItineraryPanel`, then `WrittenItinerary`**

In `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx`, add `meetingPoint`, `radiusMi` to the component's props destructuring (the line that already lists `onRemoveStop, onEditStop, onAddStop, onReorderStops,`), then pass them to `<WrittenItinerary ... />` (the render site that already passes `onAddStop={onAddStop}`):

```jsx
meetingPoint={meetingPoint}
radiusMi={radiusMi}
```

In `frontend/src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.jsx`, accept `meetingPoint` and `radiusMi` in the component's props destructuring, then pass them to **both** `AddStopPanel` render sites (lines ~157 and ~218):

```jsx
{editable && <AddStopPanel onAddStop={onAddStop} meetingPoint={meetingPoint} radiusMi={radiusMi} />}
```

and

```jsx
<AddStopPanel onAddStop={onAddStop} meetingPoint={meetingPoint} radiusMi={radiusMi} />
```

- [ ] **Step 4: Verify it builds and lints**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS, no unused-prop or undefined-variable errors. (`AddStopPanel`/`MapView` ignore the new props for now — harmless.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ItineraryPage/ItineraryPage.jsx frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx frontend/src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.jsx
git commit -m "Thread meeting point and radius into stop panels"
```

---

### Task 4: Distance-aware Add Stop search

Make `AddStopPanel` include the geo params when a meeting point + radius are present, show a per-result distance label, and show a helper caption explaining the constraint. Degrade silently when they're absent.

**Files:**
- Modify: `frontend/src/pages/ItineraryPage/AddStopPanel/AddStopPanel.jsx`
- Modify: `frontend/src/pages/ItineraryPage/AddStopPanel/AddStopPanel.css`

**Interfaces:**
- Consumes: props `meetingPoint` (`{ lat, lng } | null`), `radiusMi` (`number | null`) from Task 3; `searchCatalog(params)` from `frontend/src/api/itinerary.js` (spreads `params` into the query string, so it already supports `lat`/`lng`/`radius`); each result row may carry `distanceMi` (number) from Task 2.
- Produces: no new exports.

- [ ] **Step 1: Include geo params in the search call**

In `AddStopPanel.jsx`, update the component signature and the `searchCatalog` call. Change the destructured props:

```jsx
function AddStopPanel({ onAddStop, meetingPoint, radiusMi }) {
```

Add a derived flag near the top of the component body (after the `useState`/`useRef` lines):

```jsx
const geoActive = meetingPoint != null && radiusMi != null;
```

In the debounced effect, replace the `searchCatalog` call:

```jsx
const data = await searchCatalog({
  q: query.trim() || undefined,
  limit: 15,
  ...(geoActive && { lat: meetingPoint.lat, lng: meetingPoint.lng, radius: radiusMi }),
})
```

Add `geoActive`, `meetingPoint`, `radiusMi` to the effect's dependency array (currently `[query, open]`):

```jsx
}, [query, open, geoActive, meetingPoint, radiusMi])
```

- [ ] **Step 2: Render the helper caption and per-result distance**

In `AddStopPanel.jsx`, add the caption directly under the `<TextInput ... />` (before the `<ul>`), rendered only when `geoActive`:

```jsx
{geoActive && (
  <p className="add-stop-panel__geo-note">
    Showing places within {radiusMi} mi of your group&rsquo;s meeting point
  </p>
)}
```

In the result-row `<span className="add-stop-panel__meta">`, append the distance after the price line (inside the same span, after the `pricePerPerson` expression):

```jsx
{venue.distanceMi != null && ` · ${venue.distanceMi} mi away`}
```

- [ ] **Step 3: Style the caption**

In `AddStopPanel.css`, add:

```css
.add-stop-panel__geo-note {
  margin: 6px 0 4px;
  font-size: 0.8125rem;
  color: var(--slate-500);
}
```

(The distance text reuses the existing `.add-stop-panel__meta` styling — no new rule needed.)

- [ ] **Step 4: Verify build/lint + manual check**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS.

Manual (app running, as owner of an itinerary that has a radius): open Add Stop → caption appears, results show "N.N mi away", and results are limited to nearby venues. On an itinerary with "No limit" (or as a non-owner where meeting point is stripped): no caption, no distance, full search — unchanged.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ItineraryPage/AddStopPanel/AddStopPanel.jsx frontend/src/pages/ItineraryPage/AddStopPanel/AddStopPanel.css
git commit -m "Show distance and filter Add Stop by radius"
```

---

### Task 5: Radius circle, legend, and muted out-of-radius markers on the map

Draw a translucent teal circle centered on the meeting point, a text legend chip, and render existing stops outside the radius with a muted marker + popup note. Frame the map so the circle is fully visible. Degrade to today's behavior when props are absent.

**Files:**
- Modify: `frontend/src/pages/ItineraryPage/MapView/MapView.jsx`
- Modify: `frontend/src/pages/ItineraryPage/MapView/MapView.css`

**Interfaces:**
- Consumes: props `meetingPoint` (`{ lat, lng } | null`), `radiusMi` (`number | null`) from Task 3.
- Produces: no new exports. Uses react-leaflet `Circle` (already available from the installed `react-leaflet` package).

- [ ] **Step 1: Import Circle and add an inline haversine + out-of-radius marker variant**

In `MapView.jsx`, extend the react-leaflet import (line 4) to include `Circle`:

```jsx
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
```

Add, next to the existing `numberedIcon` factory, a muted variant and a local haversine (the frontend has no shared geo util, and the backend's `utils/geo.js` isn't importable in the browser bundle):

```jsx
// Grey variant for stops that fall outside the group's travel radius. Color
// alone isn't enough — the popup also says "Outside radius".
const mutedIcon = (n) =>
  L.divIcon({
    className: 'map-view__marker map-view__marker--out',
    html: `<span class="map-view__marker-num">${n}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const EARTH_RADIUS_MILES = 3958.8;
const toRad = (d) => (d * Math.PI) / 180;
function haversineMi(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}
```

- [ ] **Step 2: Accept props, compute framing points, and per-marker in/out status**

Change the component signature:

```jsx
function MapView({ pins = [], meetingPoint = null, radiusMi = null }) {
```

After the existing `located` / `points` / `center` lines, add:

```jsx
const showRadius = meetingPoint != null && radiusMi != null;
// Include the meeting point in framing so the whole circle is visible on load.
const framePoints = showRadius ? [...points, [meetingPoint.lat, meetingPoint.lng]] : points;
const isOutside = (pin) =>
  showRadius && haversineMi({ lat: pin.latitude, lng: pin.longitude }, meetingPoint) > radiusMi;
```

Change the `MapResizer` usage at the bottom of the map to frame on `framePoints` instead of `points`:

```jsx
<MapResizer points={framePoints} />
```

- [ ] **Step 3: Render the circle, choose marker icon by status, add popup note**

Inside `<MapContainer>`, immediately after the `<TileLayer .../>`, add the circle:

```jsx
{showRadius && (
  <Circle
    center={[meetingPoint.lat, meetingPoint.lng]}
    radius={radiusMi * 1609.34}
    pathOptions={{
      color: '#0f766e',
      weight: 2,
      fillColor: '#0d9488',
      fillOpacity: 0.1,
    }}
    interactive={false}
  />
)}
```

Update the marker `.map()` to pick the icon and add the popup note:

```jsx
{located.map((pin, i) => {
  const outside = isOutside(pin);
  return (
    <Marker
      key={pin.id ?? i}
      position={[pin.latitude, pin.longitude]}
      icon={outside ? mutedIcon(i + 1) : numberedIcon(i + 1)}
    >
      <Popup>
        <strong>{pin.name}</strong>
        {outside && <span className="map-view__popup-note"> · Outside radius</span>}
      </Popup>
    </Marker>
  );
})}
```

- [ ] **Step 4: Add the legend chip**

Inside the outer `<div className="map-view">`, after `</MapContainer>`, add the legend (only when the radius is shown):

```jsx
{showRadius && (
  <div className="map-view__legend" aria-label={`Travel radius: within ${radiusMi} miles`}>
    <span className="map-view__legend-dot" aria-hidden="true" />
    Within {radiusMi} mi radius
  </div>
)}
```

- [ ] **Step 5: Style the muted marker, legend, and popup note**

In `MapView.css`, add:

```css
.map-view__marker--out {
  filter: grayscale(1);
  opacity: 0.6;
}

.map-view__popup-note {
  color: var(--slate-500);
}

.map-view__legend {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 1; /* above Leaflet tile pane (0), below navbar (map-view is z-index:0 context) */
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--surface);
  color: var(--slate-600);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  font-size: 0.8125rem;
}

.map-view__legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #0d9488;
  border: 2px solid #0f766e;
}
```

- [ ] **Step 6: Verify build/lint + manual check**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS.

Manual (app running, owner of an itinerary with a radius): the map shows a teal circle centered on the meeting point, a "Within N mi radius" legend, the whole circle fits in view, and any stop outside the circle is grey with an "Outside radius" popup note. On a "No limit" itinerary (or non-owner view): no circle, no legend, all markers teal — unchanged.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/ItineraryPage/MapView/MapView.jsx frontend/src/pages/ItineraryPage/MapView/MapView.css
git commit -m "Draw travel-radius circle on itinerary map"
```

---

## Self-Review

**Spec coverage:**
- Backend distance filter on catalog search (spec Component 1) → Tasks 1 + 2. ✅ (all-or-none validation, `distanceMi` annotation, missing-coord drop, pure helper unit-tested, known-limitation comment carried in the doc-comment.)
- Distance-aware AddStopPanel with helper caption (spec Component 2) → Tasks 3 + 4. ✅
- MapView radius circle + legend + muted out-of-radius markers + framing (spec Component 3) → Tasks 3 + 5. ✅
- Graceful degradation when no radius/meeting point → Tasks 3/4/5 all guard on `meetingPoint`/`radiusMi`. ✅
- Owner-only meeting point boundary → derived only from the itinerary response (Task 3), which strips it for non-owners server-side; no extra frontend gate needed. ✅
- No schema change, no new libs → confirmed across tasks. ✅

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". Every code step has concrete code. ✅

**Type consistency:** `meetingPoint` is `{ lat, lng }` everywhere (ItineraryPage derives it, AddStopPanel and MapView consume it); `radiusMi` is a number of miles everywhere; backend `geo` is `{ lat, lng, radius }`; `distanceMi` is the row field name in Tasks 1, 2, and 4; `filterByRadius(rows, { lat, lng, radius })` signature matches between Task 1 (definition) and Task 2 (caller). `haversineMiles` (backend, `{latitude,longitude}`) vs `haversineMi` (frontend inline, `{lat,lng}`) are intentionally distinct helpers in different runtimes. ✅
