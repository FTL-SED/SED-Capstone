# Radius-aware Add Stop + radius circle on the map

**Date:** 2026-07-29
**Branch:** dylan-itinerary-quality
**Status:** Design approved, pending spec review

## Problem

When a group creates an itinerary they can set a **max travel radius** (in miles)
around the group's **meeting point** (the geometric median of members' start
locations). The recommendation engine already hard-filters candidate venues to
that radius, and both `travelRadius` and `meetingPointLat/Lng` are persisted on
the itinerary and returned to the owner by `GET /itineraries/:id`.

Two gaps remain on the itinerary page:

1. **Add Stop ignores the radius entirely.** The owner can search the whole
   venue catalog by name and add any venue, including one 40 miles outside the
   group's agreed radius. The search has no location awareness.
2. **The map never shows the radius.** `MapView` draws numbered stop markers but
   no radius circle and no meeting-point context, so the owner can't see the
   boundary the day was optimized within.

## Goals

- Add Stop search returns only venues **within `travelRadius`** of the meeting
  point, and each result shows its **distance** ("1.2 mi away").
- The map draws a **translucent teal radius circle** centered on the meeting
  point, plus a small text legend, and **mutes existing stops that fall outside**
  the radius.

## Non-goals

- No override toggle to search beyond the radius (kept simple by design).
- No new persisted data — everything rides on `travelRadius` +
  `meetingPointLat/Lng`, which already exist and are already returned to the owner.
- No change to the recommendation engine (it already filters by radius).
- Non-owner viewers get no radius circle: the meeting point is **owner-only**
  (`OWNER_ONLY_FIELDS` in `models/itineraries.js`, derived from members' home
  locations), and Add Stop is owner-only anyway. This is the intended privacy
  boundary, not a limitation to fix.

## Graceful degradation (the fallback)

When `travelRadius` is blank ("No limit") **or** the meeting point is missing
(`meetingPointLat`/`meetingPointLng` null — e.g. an itinerary created before this
data existed, or a non-owner view):

- **Add Stop** behaves exactly as today: full catalog search by name, no distance
  labels, no helper caption.
- **MapView** draws no circle, no legend, and mutes nothing — identical to today.

Radius behavior is strictly additive; the feature is invisible unless both a
positive radius and a meeting point are present.

## Data flow (no schema change)

```
GET /itineraries/:id  ──(owner)──▶  itinerary.travelRadius (miles)
                                    itinerary.meetingPointLat
                                    itinerary.meetingPointLng
        │
        ▼
ItineraryPage  ──derives meetingPoint {lat,lng} + radiusMi──┐
        │                                                    │
        ├──▶ AddStopPanel (lat, lng, radiusMi)               │
        │        └─▶ searchCatalog({ q, lat, lng, radius })  │
        │                └─▶ GET /stops?lat&lng&radius       │
        │                        └─▶ stopController.searchCatalog
        │                                └─▶ pins.findMany + haversine filter
        │                                        └─▶ venues[] each with distanceMi
        │
        └──▶ MapView (pins, meetingPoint, radiusMi)
                 └─▶ <Circle> + legend + muted out-of-radius markers
```

## Component 1 — Backend: distance filtering on `GET /stops`

**Files:** `backend/controllers/stopController.js`, `backend/models/pins.js`,
`backend/utils/geo.js` (reused), `backend/models/pins.test.js` (new tests).

The catalog search endpoint moved to `GET /stops` (mounted in `index.js`,
`stopRoutes.js` → `stopController.searchCatalog`), still backed by
`models/pins.js#findMany`. It currently accepts `q`, `category`, `limit`,
`offset`.

**Add three optional query params: `lat`, `lng`, `radius` (miles).**

- **Controller (`searchCatalog`)** validates them **all-or-none**: if any of the
  three is present, all three must be present and parse to finite numbers with
  `radius > 0`; otherwise respond `400 { error }`. When none are present, behave
  exactly as today. Parsing/validation lives in the controller (the HTTP layer),
  consistent with how `limit`/`offset` are already coerced there and with
  `validateRecommendationInput`'s style.
- **Model (`findMany`)** keeps filtering by `q`/`category` in the DB (unchanged),
  then — when `lat`/`lng`/`radius` are passed — filters the fetched rows by
  `haversineMiles({ latitude, longitude }, { latitude: lat, longitude: lng }) <= radius`
  using the existing helper in `utils/geo.js`, and annotates each surviving row
  with a `distanceMi` number (rounded to 1 decimal). Rows missing coordinates are
  dropped when a radius filter is active (they can't be shown as "within radius").

Rationale for filtering in the model layer after fetch rather than in Postgres:
the catalog is bounded (~4k pins) and `q` already narrows it; there's no PostGIS
set up; and this matches the codebase's existing "keep it simple, compute in JS"
approach for geo. `take`/`skip` still apply at the DB level to `q`/`category`
results — acceptable because Add Stop is a type-to-search box, not a paginated
grid, and the radius is a client-agreed constraint that typically leaves ample
in-radius results. **Known limitation to note in code:** with a very small radius
and a broad `q`, the post-fetch filter could return fewer than `limit` rows even
when more in-radius matches exist beyond `skip`. Acceptable for this UX; noted so
it isn't mistaken for a bug.

**Response shape:** unchanged array of venues; each gains `distanceMi` only when
the geo params were supplied.

**Tests (`models/pins.test.js`, `node:test`):** the `distanceMi` annotation is
correct for a known pair of coordinates; a pin outside the radius is dropped; a
pin with null coordinates is dropped when filtering and kept when not; no
`distanceMi` field appears when geo params are absent.

## Component 2 — Frontend: AddStopPanel

**Files:** `frontend/src/api/itinerary.js`,
`frontend/src/pages/ItineraryPage/ItineraryPage.jsx`,
`frontend/src/pages/ItineraryPage/AddStopPanel/AddStopPanel.jsx` (+ its `.css`),
`frontend/src/pages/ItineraryPage/WrittenItinerary/WrittenItinerary.jsx` (prop
passthrough).

- **`searchCatalog(params)`** already spreads `params` into the query string, so
  it needs no change beyond callers passing `lat`, `lng`, `radius`.
- **`ItineraryPage`** derives, from the itinerary response, a `meetingPoint`
  (`{ lat, lng }` when both `meetingPointLat`/`meetingPointLng` are numbers, else
  `null`) and `radiusMi` (`travelRadius` when a positive number, else `null`).
  These are passed to `AddStopPanel` (via `WrittenItinerary`, which currently just
  forwards `onAddStop`) and to `MapView`.
- **`AddStopPanel`** accepts `meetingPoint` and `radiusMi` props. When both are
  present it includes `lat`/`lng`/`radius` in the `searchCatalog` call. Each
  result row shows a muted distance label `{venue.distanceMi} mi away` next to the
  existing category/rating/price meta, styled with `--slate-500`. A one-line
  helper caption under the search input states the constraint in words — e.g.
  "Showing places within 5 mi of your group's meeting point" — so the filtering
  isn't a silent mystery (accessibility: don't rely on the result set alone to
  convey the rule). When the props are absent, none of this renders and the panel
  is identical to today.

`handleAddStop` in `ItineraryPage` is unchanged.

## Component 3 — Frontend: MapView radius circle + muted out-of-radius pins

**Files:** `frontend/src/pages/ItineraryPage/MapView/MapView.jsx` (+ its `.css`),
`frontend/src/pages/ItineraryPage/ItineraryPage.jsx` (pass props).

- **`MapView`** accepts `meetingPoint` (`{ lat, lng } | null`) and `radiusMi`
  (`number | null`). When both are present:
  - Render a react-leaflet `<Circle>` centered on `[meetingPoint.lat,
    meetingPoint.lng]`, `radius` = miles→meters (`radiusMi * 1609.34`),
    `pathOptions`: `color: '#0f766e'` (`--accent-strong`), `weight: 2`,
    `fillColor: '#0d9488'` (`--accent`), `fillOpacity: 0.1`,
    `interactive: false` (never steals map clicks). No animation → no
    `prefers-reduced-motion` concern.
  - Compute each stop's in/out status with a small inline haversine helper local
    to `MapView.jsx` (the frontend has no shared geo util, and the backend's
    `utils/geo.js` is not importable from the browser bundle) and render
    **out-of-radius** stops
    with a muted grey `divIcon` variant (a new `map-view__marker--out` class,
    grey fill) instead of the teal numbered pin; their `<Popup>` gets an
    "Outside radius" note so meaning isn't carried by color alone.
  - Include the meeting point in the `fitBounds`/`setView` framing so the whole
    circle is visible on load.
  - Render a small text **legend chip** in a map corner — e.g. "● Within
    {radiusMi} mi radius" — so a colorblind or screen-reader user gets the
    boundary as text, not just a faint fill.
- When `meetingPoint`/`radiusMi` are absent: no circle, no legend, all markers
  teal — identical to today.

**Styling** matches the existing `MapView.css` tokens/conventions (plain CSS,
BEM-ish, teal accent, `--shadow`, `z-index: 0` stacking context already owns the
map so the circle/legend stay below the navbar). The legend chip uses `--surface`
background, `--slate-600` text, `--radius-sm`, `--shadow-sm`.

## Error handling

- Backend: invalid geo params → `400 { error }` (all-or-none, finite, `radius >
  0`). Missing coordinates on a pin → dropped from radius-filtered results (never
  a crash).
- Frontend: `searchCatalog` failure is already caught and logged in
  `AddStopPanel`; unchanged. If `distanceMi` is absent on a row (geo params not
  sent), the distance label simply doesn't render.

## Testing

- **Backend:** `node:test` units in `models/pins.test.js` (see Component 1).
- **Frontend:** manual verification in the running app (matches repo convention —
  components aren't unit-tested, only pure/service logic is). Verify: (a) an
  itinerary with a radius shows the circle + legend and filters Add Stop with
  distance labels; (b) an itinerary with "No limit" shows neither and Add Stop
  works as before; (c) a stop dragged outside the radius (or a pre-existing far
  stop) renders muted with the popup note.

## Rollout

Single branch, single PR. Additive and backward-compatible: itineraries without a
radius or meeting point are visually and behaviorally unchanged.
