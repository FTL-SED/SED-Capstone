import './DiscoverPage.css'
import { useState, useEffect, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import SearchBar from './SearchBar/SearchBar.jsx'
import FilterControls from './FilterControls/FilterControls.jsx'
import SearchResultsSection from './SearchResultsSection/SearchResultsSection.jsx'
import RecentItinerariesSection from './RecentItinerariesSection/RecentItinerariesSection.jsx'
import { buildDiscoverParams } from './buildDiscoverParams.js'
import { listItineraries } from '../../api/itinerary.js'
import { useLikeBookmark } from '../../hooks/useLikeBookmark.js'
import { getCurrentUser } from '../../lib/currentUser.js'

const PAGE_LIMIT = 20
const DEBOUNCE_MS = 300

function DiscoverPage() {

  // for searching
  const [query, setQuery] = useState('')
  const [interests, setInterests] = useState([])
  const [sort, setSort] = useState('recent')

  // `query` updates instantly as you type (so the input stays responsive), but
  // `debouncedQuery` only catches up 300ms after you stop. The query key uses
  // the debounced value, so we fetch once you pause — not on every keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const currentUserId = getCurrentUser()?.id

  // The paginated feed. The query key IS the "identity" of this data: when the
  // search/filter/sort change, the key changes and TanStack Query fetches the
  // new feed; when it matches a fresh cache entry (e.g. revisiting the page),
  // it serves the cache with no network call. This replaces the old debounced
  // fetch effect, the manual offset/hasMore state, and the loadMore race guards.
  const queryKey = ['itineraries', { q: debouncedQuery, interests, sort }]
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      listItineraries(buildDiscoverParams(debouncedQuery, interests, sort, pageParam, PAGE_LIMIT)),
    initialPageParam: 0,
    // A full page implies there may be more; return the next offset, else stop.
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_LIMIT ? allPages.length * PAGE_LIMIT : undefined,
  })

  // The sections want one flat list; the cache stores an array of pages.
  const results = data?.pages.flat() ?? []
  const loading = isLoading
  const error = isError ? 'Something went wrong loading itineraries. Please try again.' : null
  const hasMore = !!hasNextPage
  const loadMore = fetchNextPage

  // The hook owns the shared ['dashboard', id] cache (liked/bookmarked
  // membership) AND the shared like-count override map — the SAME sources of
  // truth Home and Itinerary read, so a toggle here shows up there and vice
  // versa, count included. Because it's cached, revisiting Discover returns it
  // instantly, so the icons appear WITH the cards rather than popping in later.
  const { likedIds, bookmarkedIds, toggleLike, toggleBookmark } = useLikeBookmark({
    userId: currentUserId,
  })

  // Add/remove a single interest tag (chips are toggles).
  const toggleInterest = useCallback((tag) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }, [])

  const hasFilter = query.trim() !== '' || interests.length > 0

  return (
    <div className="discover-page">
      <FilterControls
        interests={interests}
        sort={sort}
        onToggleInterest={toggleInterest}
        onSortChange={setSort}
      >
        <SearchBar value={query} onChange={(e) => setQuery(e.target.value)} />
      </FilterControls>
      {hasFilter ? (
        <SearchResultsSection
          itineraries={results}
          loading={loading}
          error={error}
          hasMore={hasMore}
          onLoadMore={loadMore}
          likedIds={likedIds}
          bookmarkedIds={bookmarkedIds}
          onToggleLike={toggleLike}
          onToggleBookmark={toggleBookmark}
        />
      ) : (
        <RecentItinerariesSection
          itineraries={results}
          loading={loading}
          error={error}
          hasMore={hasMore}
          onLoadMore={loadMore}
          likedIds={likedIds}
          bookmarkedIds={bookmarkedIds}
          onToggleLike={toggleLike}
          onToggleBookmark={toggleBookmark}
        />
      )}
    </div>
  )
}

export default DiscoverPage
