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
