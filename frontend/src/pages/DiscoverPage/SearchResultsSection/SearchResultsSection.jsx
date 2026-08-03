import './SearchResultsSection.css'
import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import ItinerariesGrid from '../../../components/ItinerariesGrid/ItinerariesGrid.jsx'
import LoadMoreButton from '../../../components/LoadMoreButton/LoadMoreButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'

// Presentational: DiscoverPage owns the fetch and passes results in.
function SearchResultsSection({
  itineraries, loading, error, hasMore, onLoadMore,
  likedIds, bookmarkedIds, onToggleLike, onToggleBookmark,
}) {
  return (
    <section className="search-results-section">
      <SectionHeader title="Search Results" />
      <ErrorMessage message={error} />
      {!error && itineraries.length === 0 && !loading && (
        <p className="search-results-section__empty">No itineraries found.</p>
      )}
      {/* Pass `loading` so the grid shows its skeleton placeholders while a new
          search/filter fetches (e.g. after tapping a tag) instead of a blank
          section — matching the Recent section's first-load behavior. */}
      <ItinerariesGrid
        itineraries={itineraries}
        loading={loading}
        likedIds={likedIds}
        bookmarkedIds={bookmarkedIds}
        onToggleLike={onToggleLike}
        onToggleBookmark={onToggleBookmark}
      />
      {hasMore && <LoadMoreButton onClick={onLoadMore} />}
    </section>
  )
}

export default SearchResultsSection
