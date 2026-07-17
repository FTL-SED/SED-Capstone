import './LikeButton.css'
import { useState } from 'react'

// Compact like counts so large numbers stay tidy: 1200 -> "1.2K", 3400000 -> "3.4M".
const likesFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function LikeButton({ onClick, likeCount, className = "", liked }) {
  // If a parent passes `liked`, we show that. If not, we track our own on/off.
  const [selfLiked, setSelfLiked] = useState(false);
  const isOn = liked ?? selfLiked; // ?? = "use `liked` unless it's missing"

  const handleClick = (event) => {
    // Ignored on the home page (the parent's `liked` wins), matters on ItineraryPage.
    setSelfLiked((prev) => !prev);
    onClick?.(event);
  };

  return (
    <button
      className={`like-button ${className}`.trim()}
      onClick={handleClick}
      aria-pressed={isOn}
    >
      {likeCount != null ? `♥ ${likesFormatter.format(likeCount)}` : "like"}
    </button>
  );
}

export default LikeButton;
