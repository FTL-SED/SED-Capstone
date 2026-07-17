import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import './LikedItinerariesSection.css'

// The `itineraries` here are already the liked ones (HomePage filtered them).
// We still pass the liked/bookmarked state so the buttons on these cards render
// correctly and stay clickable — unliking here removes the card live.
function LikedItinerariesSection({
  itineraries = [],
  loading = false,
  likedIds,
  bookmarkedIds,
  onToggleLike,
  onToggleBookmark,
}) {
  return (
    <section className="liked-section">
      <CardCarousel
        title="Liked"
        itineraries={itineraries}
        loading={loading}
        likedIds={likedIds}
        bookmarkedIds={bookmarkedIds}
        onToggleLike={onToggleLike}
        onToggleBookmark={onToggleBookmark}
      />
    </section>
  );
}

export default LikedItinerariesSection;
