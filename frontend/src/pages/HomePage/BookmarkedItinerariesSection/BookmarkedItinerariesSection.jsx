import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import './BookmarkedItinerariesSection.css'

// The `itineraries` here are already the bookmarked ones (HomePage filtered
// them). We still pass the state so the buttons render correctly and removing a
// bookmark here drops the card live.
function BookmarkedItinerariesSection({
  itineraries = [],
  loading = false,
  likedIds,
  bookmarkedIds,
  onToggleLike,
  onToggleBookmark,
}) {
  return (
    <section className="bookmarked-section">
      <CardCarousel
        title="Bookmarked"
        itineraries={itineraries}
        loading={loading}
        emptyMessage="You haven't bookmarked any itineraries yet."
        likedIds={likedIds}
        bookmarkedIds={bookmarkedIds}
        onToggleLike={onToggleLike}
        onToggleBookmark={onToggleBookmark}
      />
    </section>
  );
}

export default BookmarkedItinerariesSection;
