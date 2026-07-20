import './DiscoverPage.css'
import { useState, useEffect, useCallback, useRef } from 'react'
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

  // Bumps whenever the search/filter/sort inputs change. loadMore reads this at
  // call time and drops its result if it changes before the request resolves,
  // so a slow page append can't land on a newer, differently-filtered feed.
  const generationRef = useRef(0)
  // Guards against overlapping loadMore calls (e.g. a double-click), which would
  // otherwise fetch the same page twice and skip the next one.
  const loadingMoreRef = useRef(false)

  // Debounced fetch of the FIRST page whenever the search/filter/sort inputs
  // change. `ignore` guards against a slow earlier request overwriting a newer
  // one (React strict-mode / fast typing).
  useEffect(() => {
    generationRef.current += 1
    let ignore = false

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
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

  // Append the next page. Ignores overlapping clicks, and drops its result if
  // the filters changed while the request was in flight.
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return
    loadingMoreRef.current = true
    const generation = generationRef.current
    try {
      const params = buildDiscoverParams(query, interests, sort, offset, PAGE_LIMIT)
      const data = await listItineraries(params)
      if (generation !== generationRef.current) return
      setResults((prev) => [...prev, ...data])
      setOffset((prev) => prev + data.length)
      setHasMore(data.length === PAGE_LIMIT)
    } catch (err) {
      if (generation !== generationRef.current) return
      console.error('Failed to load more itineraries:', err)
      setError('Something went wrong loading more itineraries. Please try again.')
    } finally {
      loadingMoreRef.current = false
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
