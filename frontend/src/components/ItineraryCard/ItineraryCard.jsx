import './ItineraryCard.css'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import LikeButton from '../../pages/ItineraryPage/LikeButton/LikeButton.jsx'
import BookmarkButton from '../../pages/ItineraryPage/BookmarkButton/BookmarkButton.jsx'
import { getCurrentUser } from '../../lib/currentUser.js'

const DEFAULT_COVER_IMAGE = "https://placehold.net/default.png";

function ItineraryCard({
  itinerary = {},
  liked,
  bookmarked,
  onToggleLike,
  onToggleBookmark,
}) {
  const { id, title, location, coverImageUrl, likeCount, creator } = itinerary;
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = imageFailed || !coverImageUrl ? DEFAULT_COVER_IMAGE : coverImageUrl;
  // Only offer bookmarking on other people's itineraries, not your own.
  const currentUser = getCurrentUser();
  const isOwner = currentUser?.id && creator?.id && currentUser.id === creator.id;

  // First stop the click from bubbling up and navigating the card's <Link>,
  // then report the toggle to whoever owns the state (HomePage on the home page).
  const handleLike = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleLike?.(id);
  };

  const handleBookmark = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleBookmark?.(id);
  };

  return (
    <Link className="itinerary-card" to={id ? `/itinerary/${id}` : "#"}>
      <img
        className="itinerary-card__cover"
        src={imageSrc}
        alt={title || "Itinerary cover"}
        onError={() => setImageFailed(true)}
      />
      {!isOwner && (
        <BookmarkButton
          className="itinerary-card__bookmark"
          bookmarked={bookmarked}
          onClick={handleBookmark}
        />
      )}
      <div className="itinerary-card__body">
        <div className="itinerary-card__title-row">
          <h3>{title || "Untitled Itinerary"}</h3>
          <LikeButton
            className="itinerary-card__like"
            likeCount={likeCount ?? 0}
            liked={liked}
            onClick={handleLike}
          />
        </div>
        <div className="itinerary-card__meta">
          <p>{location}</p>
          {creator?.username && (
            <span className="itinerary-card__creator">{creator.username}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ItineraryCard;
