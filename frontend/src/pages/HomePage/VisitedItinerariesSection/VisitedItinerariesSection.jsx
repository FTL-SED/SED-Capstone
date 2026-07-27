import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import './VisitedItinerariesSection.css'

// The `itineraries` here are already the visited ones (HomePage filtered them).
// The cards keep their like/bookmark hearts (which stay live via the shared
// hook); there is no visited toggle on cards — marking happens on ItineraryPage.
function VisitedItinerariesSection({
  itineraries = [],
  loading = false,
  likedIds,
  bookmarkedIds,
  onToggleLike,
  onToggleBookmark,
}) {
  return (
    <section className="visited-section">
      <CardCarousel
        title="Visited"
        itineraries={itineraries}
        loading={loading}
        emptyMessage="You haven't marked any itineraries as visited yet."
        likedIds={likedIds}
        bookmarkedIds={bookmarkedIds}
        onToggleLike={onToggleLike}
        onToggleBookmark={onToggleBookmark}
      />
    </section>
  );
}

export default VisitedItinerariesSection;
