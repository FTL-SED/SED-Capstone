import './LikeButton.css'
import { useState } from 'react'

// Compact like counts so large numbers stay tidy: 1200 -> "1.2K", 3400000 -> "3.4M".
const likesFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// A heart action button. On the ItineraryPage it reads as a pill (via
// .action-btn, matching Save/Copy/Delete); on a card the parent passes
// itinerary-card__like to strip the chrome back to plain text.
function LikeButton({ onClick, likeCount, className = "", liked }) {
  // If a parent passes `liked`, we show that. If not, we track our own on/off.
  const [selfLiked, setSelfLiked] = useState(false);
  const isOn = liked ?? selfLiked; // ?? = "use `liked` unless it's missing"

  const handleClick = (event) => {
    // Only self-toggle when uncontrolled; when a parent owns `liked`, its value wins.
    if (liked === undefined) setSelfLiked((prev) => !prev);
    onClick?.(event);
  };

  const label = likeCount != null ? likesFormatter.format(likeCount) : "Like";

  return (
    <button
      className={`action-btn like-button ${className}`.trim()}
      onClick={handleClick}
      aria-pressed={isOn}
      aria-label={isOn ? "Unlike" : "Like"}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill={isOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
      {label}
    </button>
  );
}

export default LikeButton;
