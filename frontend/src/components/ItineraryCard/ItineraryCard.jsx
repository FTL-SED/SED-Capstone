import './ItineraryCard.css'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const DEFAULT_COVER_IMAGE = "https://placehold.net/default.png";

// Compact like counts so large numbers stay tidy: 1200 -> "1.2K", 3400000 -> "3.4M".
const likesFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function ItineraryCard({ itinerary = {} }) {
  const { id, title, location, coverImageUrl, likeCount, creator } = itinerary;
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = imageFailed || !coverImageUrl ? DEFAULT_COVER_IMAGE : coverImageUrl;
  return (
    <Link className="itinerary-card" to={id ? `/itinerary/${id}` : "#"}>
      <img
        className="itinerary-card__cover"
        src={imageSrc}
        alt={title || "Itinerary cover"}
        onError={() => setImageFailed(true)}
      />
      <div className="itinerary-card__body">
        <div className="itinerary-card__title-row">
          <h3>{title || "Untitled Itinerary"}</h3>
          <span className="itinerary-card__likes">♥ {likesFormatter.format(likeCount ?? 0)}</span>
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
