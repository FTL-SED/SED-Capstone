import './ItinerariesGrid.css'
import ItineraryCard from '../ItineraryCard/ItineraryCard.jsx'

function ItinerariesGrid({
  itineraries = [],
  likedIds,
  bookmarkedIds,
  onToggleLike,
  onToggleBookmark,
}) {
  return (
    <div className="itineraries-grid">
      {itineraries.map((itinerary) => (
        <ItineraryCard
          key={itinerary.id}
          itinerary={itinerary}
          liked={likedIds?.has(itinerary.id)}
          bookmarked={bookmarkedIds?.has(itinerary.id)}
          onToggleLike={onToggleLike}
          onToggleBookmark={onToggleBookmark}
        />
      ))}
    </div>
  );
}

export default ItinerariesGrid;
