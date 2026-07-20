# Discover Page — Search & Filter

**Date:** 2026-07-20
**Scope:** Frontend only. Wire the existing Discover page to the already-complete
`GET /itineraries` search/filter/sort/pagination API so users can search public
itineraries by free text, filter by interest tags, sort by recent/popular, and
page through results with "Load More".

## Background

The backend and API client are already complete:

- `GET /itineraries` (`backend/controllers/itineraryController.js`) supports
  `q` (free-text over title/location), `location`, `interests` (comma-separated
  tags matching any pin tag), `scope` (`public` | `mine`), `sort`
  (`recent` | `popular`), `limit`, `offset`.
- `frontend/src/api/itinerary.js` → `listItineraries(params)` passes all of
  these through.

The Discover page (`frontend/src/pages/DiscoverPage/`) is scaffolded but inert:
`DiscoverPage.jsx` toggles between `SearchResultsSection` and
`RecentItinerariesSection` based on whether `query` is non-empty, but both
render `itineraries={[]}` — no fetching, no filter UI, and `LoadMoreButton` has
no handler.

This is a **frontend wiring** task. No backend or API-client changes.

## Decisions

- **Filter UI:** add a filter bar (interest tag-chips + Recent/Popular sort
  toggle). No separate location field — `?q=` already searches location.
- **Search trigger:** debounced live search (~300ms after the user stops
  typing / changing filters).
- **Load More:** appends the next page (`offset += limit`).
- **Filters apply everywhere:** the same query params drive both the search
  results and the default (no-query) Recent Itineraries feed.
- **Deviation from spec component tree (noted per `frontend/CLAUDE.md`):** a new
  `FilterControls` component is added under `DiscoverPage/`. The spec's tree
  (`planning/project_plan.md`) shows only a `SearchBar`; US #9
  ("search or filter itineraries by criteria such as location or interests")
  requires filter controls, so this addition is justified.
- **Out of scope:** like/bookmark wiring on Discover cards. That state is owned
  by `HomePage`; Discover cards render read-only (buttons present but not wired
  to shared state). Cards still navigate to the itinerary detail page.

## Architecture & data flow

`DiscoverPage` becomes the single owner of search/filter state and data
fetching, mirroring how `HomePage` owns its fetch. The section components become
purely presentational.

State held in `DiscoverPage`:

- `query` — string → `?q=`
- `interests` — array of selected tags → `?interests=` (comma-joined)
- `sort` — `'recent' | 'popular'` → `?sort=` (default `'recent'`)
- `results` — array of itineraries
- `offset` — number, current pagination offset (starts at 0)
- `hasMore` — boolean, whether another page likely exists
- `loading` — boolean
- `error` — error state for the fetch

Behavior:

- A debounced (~300ms) effect keyed on `[query, interests, sort]` calls
  `listItineraries({ scope: 'public', q, interests, sort, limit, offset: 0 })`
  and **replaces** `results`, resets `offset` to 0.
- "Load More" calls `listItineraries` with the next `offset` and **appends** to
  `results`.
- `hasMore` is derived from whether the last page returned a full `limit` rows
  (a short page means no more).
- Which section renders is chosen by `query || interests.length > 0`
  (→ `SearchResultsSection`, else `RecentItinerariesSection`). Both render the
  same fetched `results`.
- **Stale-response guard:** the fetch effect uses an `ignore` flag in its
  cleanup so a slow earlier request can't overwrite a newer one.

`PAGE_LIMIT` constant (e.g. 20) defined in `DiscoverPage.jsx`.

## Components & files

New / changed files (all under `frontend/src/`):

- **`pages/DiscoverPage/FilterControls/FilterControls.jsx`** *(new)* — interest
  tag-chips (from `api/vocab.js` `INTEREST_TAGS`) plus a Recent↔Popular sort
  toggle. Controlled via props: `interests`, `sort`, `onToggleInterest`,
  `onSortChange`. Pure presentational.
- **`pages/DiscoverPage/FilterControls/FilterControls.css`** *(new)* — styling
  for chips + toggle.
- **`pages/DiscoverPage/DiscoverPage.jsx`** *(changed)* — owns state, debounced
  fetching, pagination; renders `SearchBar`, `FilterControls`, and one section.
- **`pages/DiscoverPage/SearchResultsSection/SearchResultsSection.jsx`**
  *(changed)* — accepts `itineraries`, `loading`, `error`, `onLoadMore`,
  `hasMore`; wires `LoadMoreButton`'s `onClick`, hides it when `!hasMore`.
- **`pages/DiscoverPage/RecentItinerariesSection/RecentItinerariesSection.jsx`**
  *(changed)* — same prop shape and wiring as `SearchResultsSection`.
- **`pages/DiscoverPage/buildDiscoverParams.js`** *(new)* — pure helper that
  builds the `listItineraries` params object from
  `(query, interests, sort, offset, limit)`. Keeps testable logic out of the
  component (same pattern as `CreateItineraryPage/buildRequest.js`).
- **`pages/DiscoverPage/buildDiscoverParams.test.js`** *(new)* — co-located
  Vitest unit tests for the helper.

Unchanged: `SearchBar.jsx` (already a controlled input), the shared
`ItinerariesGrid`, `LoadMoreButton`, `SectionHeader`, `ErrorMessage`
components, `api/itinerary.js`, and all backend code.

## `buildDiscoverParams` contract

```
buildDiscoverParams(query, interests, sort, offset, limit) -> params object
```

- Always includes `scope: 'public'`, `sort`, `limit`, `offset`.
- Includes `q` only when `query.trim()` is non-empty.
- Includes `interests` (comma-joined) only when the array is non-empty.
- Never emits empty-string params (so the default feed is a clean
  `scope=public&sort=recent&...` request).

Tests cover: empty query + no interests (default feed), query only, interests
only, both, sort variants, and offset passthrough.

## Error & empty states

- **Fetch failure:** `console.error` the raw error; render the existing
  `ErrorMessage` component in place of the grid.
- **Empty results:** show a simple "No itineraries found" message in the
  section when `results` is empty and not loading.
- **Loading:** sections receive `loading` and can show a lightweight loading
  state (consistent with how `HomePage` sections handle `loading`).

## Testing

- Co-located Vitest unit tests for `buildDiscoverParams` — the same approach as
  `CreateItineraryPage/buildRequest.test.js`. Component-level testing of the
  debounce/fetch is out of scope; the pure helper carries the query-shaping
  logic that's worth locking down.

## Non-goals

- No like/bookmark state wiring on Discover (owned by `HomePage`).
- No separate location filter field (covered by `?q=`).
- No backend, API-client, or shared-component changes.
- No changes to the spec's file structure beyond the noted `FilterControls`
  addition.
