import './RecentItinerariesSection.css'
import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import ItinerariesGrid from '../../../components/ItinerariesGrid/ItinerariesGrid.jsx'
import LoadMoreButton from '../../../components/LoadMoreButton/LoadMoreButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'

// Presentational: DiscoverPage owns the fetch and passes results in.
function RecentItinerariesSection({
  itineraries, loading, error, hasMore, onLoadMore,
  likedIds, bookmarkedIds, onToggleLike, onToggleBookmark,
}) {
  return (
    <section className="recent-itineraries-section">
      <SectionHeader title="Recent Itineraries" />
      <ErrorMessage message={error} />
      {!error && itineraries.length === 0 && !loading && (
        <p className="recent-itineraries-section__empty">No itineraries yet.</p>
      )}
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

export default RecentItinerariesSection
