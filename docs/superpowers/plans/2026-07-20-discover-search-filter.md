# Discover Page Search & Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Discover page to the existing `GET /itineraries` API so users can search public itineraries by text, filter by interest tags, sort by recent/popular, and page through results with "Load More".

**Architecture:** `DiscoverPage` becomes the single owner of search/filter state and data fetching (mirroring `HomePage`). A pure `buildDiscoverParams` helper shapes query params. A new presentational `FilterControls` component renders interest tag-chips + a sort toggle. The two section components (`SearchResultsSection`, `RecentItinerariesSection`) become presentational and receive `itineraries`/`loading`/`error`/`onLoadMore`/`hasMore` as props.

**Tech Stack:** React 19, React Router 7, axios (via `src/api/client.js`), Node's built-in test runner (`node --test`).

## Global Constraints

- Frontend talks ONLY to the backend over HTTP via `src/api/` wrappers — no Supabase client, no secrets. (root `CLAUDE.md`)
- Frontend file structure follows the spec; the ONE approved deviation is adding `FilterControls` under `DiscoverPage/`. Do not add other new files/dirs beyond those this plan lists. (`frontend/CLAUDE.md`)
- Tests use Node's built-in runner: `import { test } from 'node:test'` + `import assert from 'node:assert/strict'`. Run with `npm test` (`node --test`) from `frontend/`. (matches `CreateItineraryPage/buildRequest.test.js`)
- Backend and `src/api/itinerary.js` are COMPLETE — do not modify them. `listItineraries(params)` already forwards `q`, `interests`, `sort`, `scope`, `limit`, `offset`.
- Page size: `PAGE_LIMIT = 20`. Debounce: `300` ms.
- Interest tags come from `src/api/vocab.js` `INTEREST_TAGS`. Sort values are `'recent'` and `'popular'`.

---

### Task 1: `buildDiscoverParams` pure helper

Shapes the `listItineraries` params object from the page's state. Pure and unit-tested — carries the query-shaping logic out of the component.

**Files:**
- Create: `frontend/src/pages/DiscoverPage/buildDiscoverParams.js`
- Test: `frontend/src/pages/DiscoverPage/buildDiscoverParams.test.js`

**Interfaces:**
- Consumes: nothing (pure function).
- Produces: `buildDiscoverParams(query, interests, sort, offset, limit)` → params object. Always includes `scope: 'public'`, `sort`, `limit`, `offset`. Includes `q` (trimmed) only when `query.trim()` is non-empty. Includes `interests` (comma-joined) only when the `interests` array is non-empty. Never emits empty-string values.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/pages/DiscoverPage/buildDiscoverParams.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildDiscoverParams } from './buildDiscoverParams.js'

test('default feed: no query, no interests → clean public/recent params', () => {
  const params = buildDiscoverParams('', [], 'recent', 0, 20)
  assert.deepEqual(params, { scope: 'public', sort: 'recent', limit: 20, offset: 0 })
})

test('query only: includes trimmed q', () => {
  const params = buildDiscoverParams('  san fran  ', [], 'recent', 0, 20)
  assert.equal(params.q, 'san fran')
  assert.equal(params.interests, undefined)
})

test('blank/whitespace query is omitted', () => {
  const params = buildDiscoverParams('   ', [], 'recent', 0, 20)
  assert.equal(params.q, undefined)
})

test('interests only: comma-joined, no q', () => {
  const params = buildDiscoverParams('', ['art', 'museum'], 'recent', 0, 20)
  assert.equal(params.interests, 'art,museum')
  assert.equal(params.q, undefined)
})

test('empty interests array is omitted', () => {
  const params = buildDiscoverParams('beach', [], 'popular', 0, 20)
  assert.equal(params.interests, undefined)
})

test('query + interests + popular sort together', () => {
  const params = buildDiscoverParams('sf', ['nature'], 'popular', 0, 20)
  assert.deepEqual(params, {
    scope: 'public',
    sort: 'popular',
    limit: 20,
    offset: 0,
    q: 'sf',
    interests: 'nature',
  })
})

test('offset is passed through for pagination', () => {
  const params = buildDiscoverParams('', [], 'recent', 40, 20)
  assert.equal(params.offset, 40)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test`
Expected: FAIL — `Cannot find module './buildDiscoverParams.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/pages/DiscoverPage/buildDiscoverParams.js`:

```js
// Builds the query params for listItineraries() from the Discover page's
// search/filter/sort/pagination state. Pure so it can be unit-tested apart
// from the component (same pattern as CreateItineraryPage/buildRequest.js).
// Omits q/interests when empty so the default feed is a clean
// scope=public&sort=recent request.
export function buildDiscoverParams(query, interests, sort, offset, limit) {
  const params = { scope: 'public', sort, limit, offset }

  const trimmed = query.trim()
  if (trimmed !== '') {
    params.q = trimmed
  }

  if (interests.length > 0) {
    params.interests = interests.join(',')
  }

  return params
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test`
Expected: PASS — all `buildDiscoverParams` tests pass (and existing tests still pass).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/DiscoverPage/buildDiscoverParams.js frontend/src/pages/DiscoverPage/buildDiscoverParams.test.js
git commit -m "Add buildDiscoverParams helper for Discover page queries"
```

---

### Task 2: `FilterControls` component

Presentational filter bar: interest tag-chips + Recent/Popular sort toggle. Controlled entirely by props from `DiscoverPage`.

**Files:**
- Create: `frontend/src/pages/DiscoverPage/FilterControls/FilterControls.jsx`
- Create: `frontend/src/pages/DiscoverPage/FilterControls/FilterControls.css`

**Interfaces:**
- Consumes: `INTEREST_TAGS` from `../../../api/vocab.js`.
- Produces: `<FilterControls interests={string[]} sort={'recent'|'popular'} onToggleInterest={(tag) => void} onSortChange={(sort) => void} />`. `onToggleInterest` is called with a single tag string when a chip is clicked (parent adds/removes it). `onSortChange` is called with `'recent'` or `'popular'`.

There is no meaningful automated test for a purely presentational component here; verification is by rendering in Task 4. This task is a single commit.

- [ ] **Step 1: Write the component**

Create `frontend/src/pages/DiscoverPage/FilterControls/FilterControls.jsx`:

```jsx
import './FilterControls.css'
import { INTEREST_TAGS } from '../../../api/vocab.js'

// Presentational filter bar for the Discover page. The parent (DiscoverPage)
// owns the selected interests + sort and re-fetches when they change; this
// component just renders the controls and reports clicks.
function FilterControls({ interests, sort, onToggleInterest, onSortChange }) {
  return (
    <div className="filter-controls">
      <div className="filter-controls__interests">
        {INTEREST_TAGS.map((tag) => {
          const selected = interests.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              className={
                selected
                  ? 'filter-chip filter-chip--selected'
                  : 'filter-chip'
              }
              aria-pressed={selected}
              onClick={() => onToggleInterest(tag)}
            >
              {tag}
            </button>
          )
        })}
      </div>

      <div className="filter-controls__sort">
        <button
          type="button"
          className={
            sort === 'recent' ? 'sort-toggle sort-toggle--active' : 'sort-toggle'
          }
          aria-pressed={sort === 'recent'}
          onClick={() => onSortChange('recent')}
        >
          Recent
        </button>
        <button
          type="button"
          className={
            sort === 'popular' ? 'sort-toggle sort-toggle--active' : 'sort-toggle'
          }
          aria-pressed={sort === 'popular'}
          onClick={() => onSortChange('popular')}
        >
          Popular
        </button>
      </div>
    </div>
  )
}

export default FilterControls
```

- [ ] **Step 2: Write the styles**

Create `frontend/src/pages/DiscoverPage/FilterControls/FilterControls.css`:

```css
/* Discover filter bar: a row of selectable interest chips plus a
   Recent/Popular sort toggle. */
.filter-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.filter-controls__interests {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-radius: 999px;
  background: #fff;
  cursor: pointer;
  font-size: 0.85rem;
  text-transform: capitalize;
}

.filter-chip--selected {
  background: #2d3a4a;
  color: #fff;
  border-color: #2d3a4a;
}

.filter-controls__sort {
  display: flex;
  gap: 4px;
}

.sort-toggle {
  padding: 6px 14px;
  border: 1px solid #ccc;
  background: #fff;
  cursor: pointer;
  font-size: 0.85rem;
}

.sort-toggle--active {
  background: #2d3a4a;
  color: #fff;
  border-color: #2d3a4a;
}
```

- [ ] **Step 3: Verify it compiles (lint)**

Run: `cd frontend && npm run lint`
Expected: PASS — no errors for the new files.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DiscoverPage/FilterControls/
git commit -m "Add FilterControls component for Discover interests + sort"
```

---

### Task 3: Make section components presentational

Turn `SearchResultsSection` and `RecentItinerariesSection` into presentational components that render passed-in itineraries, wire `LoadMoreButton`, and show loading / error / empty states.

**Files:**
- Modify: `frontend/src/pages/DiscoverPage/SearchResultsSection/SearchResultsSection.jsx`
- Modify: `frontend/src/pages/DiscoverPage/RecentItinerariesSection/RecentItinerariesSection.jsx`

**Interfaces:**
- Consumes: `ItinerariesGrid`, `LoadMoreButton`, `SectionHeader`, `ErrorMessage` (existing shared components). `ErrorMessage` takes a `message` prop and renders nothing when it's falsy.
- Produces: both components share the prop shape `{ itineraries: array, loading: boolean, error: string|null, hasMore: boolean, onLoadMore: () => void }`. `SearchResultsSection` header is `"Search Results"`; `RecentItinerariesSection` header is `"Recent Itineraries"`.

Presentational render logic; verified end-to-end in Task 4. Single commit.

- [ ] **Step 1: Rewrite `SearchResultsSection.jsx`**

Replace the contents of `frontend/src/pages/DiscoverPage/SearchResultsSection/SearchResultsSection.jsx`:

```jsx
import './SearchResultsSection.css'
import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import ItinerariesGrid from '../../../components/ItinerariesGrid/ItinerariesGrid.jsx'
import LoadMoreButton from '../../../components/LoadMoreButton/LoadMoreButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'

// Presentational: DiscoverPage owns the fetch and passes results in.
function SearchResultsSection({ itineraries, loading, error, hasMore, onLoadMore }) {
  return (
    <section className="search-results-section">
      <SectionHeader title="Search Results" />
      <ErrorMessage message={error} />
      {!error && itineraries.length === 0 && !loading && (
        <p className="search-results-section__empty">No itineraries found.</p>
      )}
      <ItinerariesGrid itineraries={itineraries} />
      {hasMore && <LoadMoreButton onClick={onLoadMore} />}
    </section>
  )
}

export default SearchResultsSection
```

- [ ] **Step 2: Rewrite `RecentItinerariesSection.jsx`**

Replace the contents of `frontend/src/pages/DiscoverPage/RecentItinerariesSection/RecentItinerariesSection.jsx`:

```jsx
import './RecentItinerariesSection.css'
import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import ItinerariesGrid from '../../../components/ItinerariesGrid/ItinerariesGrid.jsx'
import LoadMoreButton from '../../../components/LoadMoreButton/LoadMoreButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'

// Presentational: DiscoverPage owns the fetch and passes results in.
function RecentItinerariesSection({ itineraries, loading, error, hasMore, onLoadMore }) {
  return (
    <section className="recent-itineraries-section">
      <SectionHeader title="Recent Itineraries" />
      <ErrorMessage message={error} />
      {!error && itineraries.length === 0 && !loading && (
        <p className="recent-itineraries-section__empty">No itineraries yet.</p>
      )}
      <ItinerariesGrid itineraries={itineraries} />
      {hasMore && <LoadMoreButton onClick={onLoadMore} />}
    </section>
  )
}

export default RecentItinerariesSection
```

- [ ] **Step 3: Verify it compiles (lint)**

Run: `cd frontend && npm run lint`
Expected: PASS — no errors for the modified files.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DiscoverPage/SearchResultsSection/SearchResultsSection.jsx frontend/src/pages/DiscoverPage/RecentItinerariesSection/RecentItinerariesSection.jsx
git commit -m "Make Discover section components presentational"
```

---

### Task 4: Wire `DiscoverPage` — state, debounced fetch, pagination

Make `DiscoverPage` the owner of search/filter state and data fetching, rendering `SearchBar`, `FilterControls`, and one section.

**Files:**
- Modify: `frontend/src/pages/DiscoverPage/DiscoverPage.jsx`

**Interfaces:**
- Consumes: `buildDiscoverParams` (Task 1), `FilterControls` (Task 2), the presentational sections (Task 3), `listItineraries` from `../../api/itinerary.js`, and `SearchBar`.
- Produces: the finished page. No exports consumed elsewhere.

- [ ] **Step 1: Rewrite `DiscoverPage.jsx`**

Replace the contents of `frontend/src/pages/DiscoverPage/DiscoverPage.jsx`:

```jsx
import './DiscoverPage.css'
import { useState, useEffect, useCallback } from 'react'
import SearchBar from './SearchBar/SearchBar.jsx'
import FilterControls from './FilterControls/FilterControls.jsx'
import SearchResultsSection from './SearchResultsSection/SearchResultsSection.jsx'
import RecentItinerariesSection from './RecentItinerariesSection/RecentItinerariesSection.jsx'
import { buildDiscoverParams } from './buildDiscoverParams.js'
import { listItineraries } from '../../api/itinerary.js'

const PAGE_LIMIT = 20
const DEBOUNCE_MS = 300

function DiscoverPage() {
  const [query, setQuery] = useState('')
  const [interests, setInterests] = useState([])
  const [sort, setSort] = useState('recent')

  const [results, setResults] = useState([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Add/remove a single interest tag (chips are toggles).
  const toggleInterest = useCallback((tag) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }, [])

  // Debounced fetch of the FIRST page whenever the search/filter/sort inputs
  // change. `ignore` guards against a slow earlier request overwriting a newer
  // one (React strict-mode / fast typing).
  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError(null)

    const timer = setTimeout(async () => {
      try {
        const params = buildDiscoverParams(query, interests, sort, 0, PAGE_LIMIT)
        const data = await listItineraries(params)
        if (ignore) return
        setResults(data)
        setOffset(data.length)
        setHasMore(data.length === PAGE_LIMIT)
      } catch (err) {
        if (ignore) return
        console.error('Failed to load Discover itineraries:', err)
        setError('Something went wrong loading itineraries. Please try again.')
        setResults([])
        setHasMore(false)
      } finally {
        if (!ignore) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [query, interests, sort])

  // Append the next page. Uses the current offset; on success advances it.
  const loadMore = useCallback(async () => {
    try {
      const params = buildDiscoverParams(query, interests, sort, offset, PAGE_LIMIT)
      const data = await listItineraries(params)
      setResults((prev) => [...prev, ...data])
      setOffset((prev) => prev + data.length)
      setHasMore(data.length === PAGE_LIMIT)
    } catch (err) {
      console.error('Failed to load more itineraries:', err)
      setError('Something went wrong loading more itineraries. Please try again.')
    }
  }, [query, interests, sort, offset])

  const hasFilter = query.trim() !== '' || interests.length > 0

  return (
    <div className="discover-page">
      <SearchBar value={query} onChange={(e) => setQuery(e.target.value)} />
      <FilterControls
        interests={interests}
        sort={sort}
        onToggleInterest={toggleInterest}
        onSortChange={setSort}
      />
      {hasFilter ? (
        <SearchResultsSection
          itineraries={results}
          loading={loading}
          error={error}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      ) : (
        <RecentItinerariesSection
          itineraries={results}
          loading={loading}
          error={error}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      )}
    </div>
  )
}

export default DiscoverPage
```

- [ ] **Step 2: Verify it compiles (lint)**

Run: `cd frontend && npm run lint`
Expected: PASS — no errors.

- [ ] **Step 3: Run the full test suite**

Run: `cd frontend && npm test`
Expected: PASS — all tests, including `buildDiscoverParams` from Task 1.

- [ ] **Step 4: Manual verification in the browser**

Start the backend (`cd backend && npm run dev`) and frontend (`cd frontend && npm run dev`), then open the Discover page and confirm:
- On load (no query), recent public itineraries appear in the grid.
- Typing in the search box filters after ~300ms.
- Clicking interest chips filters results; clicking again removes the filter.
- The Recent/Popular toggle changes ordering.
- "Load More" appends more cards and disappears when there are no more.
- With a query that matches nothing, "No itineraries found." shows.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/DiscoverPage/DiscoverPage.jsx
git commit -m "Wire Discover page search, filters, sort, and pagination"
```

---

## Self-Review Notes

- **Spec coverage:** free-text search (Task 4 `q` via helper), interest filter (Tasks 2+4), sort toggle (Tasks 2+4), default recent feed (Task 4 `hasFilter` branch), Load More append (Task 4 `loadMore`), error/empty states (Task 3), `buildDiscoverParams` helper + tests (Task 1), `FilterControls` deviation noted (Task 2). All covered.
- **Type consistency:** `buildDiscoverParams(query, interests, sort, offset, limit)` signature is identical across Tasks 1 and 4. Section prop shape `{ itineraries, loading, error, hasMore, onLoadMore }` is identical across Tasks 3 and 4. `FilterControls` props `{ interests, sort, onToggleInterest, onSortChange }` identical across Tasks 2 and 4.
- **No placeholders:** every code step contains complete code and exact commands.
