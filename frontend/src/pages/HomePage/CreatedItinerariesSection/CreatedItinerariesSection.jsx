import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import NewItineraryButton from '../NewItineraryButton/NewItineraryButton.jsx'
import './CreatedItinerariesSection.css'

function CreatedItinerariesSection({
  itineraries = [],
  loading = false,
  likedIds,
  bookmarkedIds,
  onToggleLike,
  onToggleBookmark,
}) {
  return (
    <section className="created-section">
      <CardCarousel
        title="Created"
        headerAction={<NewItineraryButton />}
        itineraries={itineraries}
        loading={loading}
        emptyMessage="You haven't created any itineraries yet. Start a New Trip!"
        likedIds={likedIds}
        bookmarkedIds={bookmarkedIds}
        onToggleLike={onToggleLike}
        onToggleBookmark={onToggleBookmark}
      />
    </section>
  );
}

export default CreatedItinerariesSection;
