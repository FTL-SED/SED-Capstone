import './CardCarousel.css'
import { useRef, useState, useEffect, useCallback } from 'react'
import ItineraryCard from '../ItineraryCard/ItineraryCard.jsx'
import CarouselArrow from '../CarouselArrow/CarouselArrow.jsx'
import SectionHeader from '../SectionHeader/SectionHeader.jsx'

// How many placeholder squares to show while the first fetch is in flight —
// matches the ~5 cards visible per view.
const PLACEHOLDER_COUNT = 5;

// `title` is the section heading; the arrows sit on the same row (right-aligned)
// so the heading and controls line up. `headerAction` is an optional extra
// control (e.g. the "New Trip" button) shown just left of the arrows.
function CardCarousel({
  title,
  headerAction,
  itineraries = [],
  loading = false,
  // Shown in place of the cards once loading is done and the list is empty
  // (e.g. "You haven't liked any itineraries yet."). Omit to show nothing.
  emptyMessage,
  // Like/bookmark wiring, only supplied by the HomePage sections. Undefined
  // elsewhere (e.g. the Created section), so the cards fall back to their own
  // self-toggling behavior.
  likedIds,
  bookmarkedIds,
  onToggleLike,
  onToggleBookmark,
}) {
  const trackRef = useRef(null);
  // Whether each arrow can still move: false at the very start / very end of
  // the row, so we can grey the arrows out like the design.
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  // Recompute the arrow states from the track's current scroll offset. Allow a
  // 1px slack so rounding at the extremes doesn't leave an arrow stuck enabled.
  const updateArrowStates = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollBack(el.scrollLeft > 1);
    setCanScrollForward(el.scrollLeft < maxScroll - 1);
  }, []);

  // Re-evaluate whenever the content changes (cards arrive) or the window
  // resizes (the number of cards per view, and thus the max scroll, changes).
  useEffect(() => {
    updateArrowStates();
    window.addEventListener('resize', updateArrowStates);
    return () => window.removeEventListener('resize', updateArrowStates);
  }, [updateArrowStates, itineraries, loading]);

  // Page by one full view (~5 cards) in either direction.
  const scrollBy = (multiplier) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * multiplier, behavior: 'smooth' });
  };

  return (
    <div className="card-carousel">
      {/* Heading + controls share one row so the title lines up with the arrows. */}
      <SectionHeader title={title}>
        <div className="card-carousel__controls">
          {headerAction}
          <CarouselArrow
            direction="back"
            onClick={() => scrollBy(-1)}
            disabled={!canScrollBack}
          />
          <CarouselArrow
            direction="forward"
            onClick={() => scrollBy(1)}
            disabled={!canScrollForward}
          />
        </div>
      </SectionHeader>
      <div
        className="card-carousel__track"
        ref={trackRef}
        onScroll={updateArrowStates}
      >
        {loading
          ? Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
              <div key={i} className="itinerary-card itinerary-card--placeholder" />
            ))
          : itineraries.length === 0
          ? emptyMessage && (
              <p className="card-carousel__empty">{emptyMessage}</p>
            )
          : itineraries.map((itinerary) => (
              <ItineraryCard
                key={itinerary.id}
                itinerary={itinerary}
                // Look up this card's on/off from the Sets. `?.` keeps it
                // undefined when no Sets were passed, so the buttons self-toggle.
                liked={likedIds?.has(itinerary.id)}
                bookmarked={bookmarkedIds?.has(itinerary.id)}
                onToggleLike={onToggleLike}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
      </div>
    </div>
  );
}

export default CardCarousel;
