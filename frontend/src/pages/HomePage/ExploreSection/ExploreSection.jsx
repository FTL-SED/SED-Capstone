import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import './ExploreSection.css'

// Explore no longer fetches or holds state — HomePage owns the itinerary list
// and the liked/bookmarked state. This section is now just a pass-through so
// every card on the page reads from the same source of truth.
function ExploreSection({
  itineraries = [],
  loading = false,
  likedIds,
  bookmarkedIds,
  onToggleLike,
  onToggleBookmark,
}) {
  return (
    <section className="explore-section">
      <CardCarousel
        title="Explore"
        itineraries={itineraries}
        loading={loading}
        emptyMessage="No itineraries to explore yet. Check back soon!"
        likedIds={likedIds}
        bookmarkedIds={bookmarkedIds}
        onToggleLike={onToggleLike}
        onToggleBookmark={onToggleBookmark}
      />
    </section>
  );
}

export default ExploreSection;
