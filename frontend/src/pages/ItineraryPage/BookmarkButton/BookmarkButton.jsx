import './BookmarkButton.css'
import { useState } from 'react'

// A bookmark ("Save") action button. On the ItineraryPage it reads as a pill
// (via .action-btn, matching the neighbouring buttons); on a card the parent
// passes itinerary-card__bookmark to render it as a compact corner overlay
// (the label is hidden there via CSS).
function BookmarkButton({ onClick, className = "", bookmarked }) {
  // If a parent passes `bookmarked`, we show that. If not, we track our own on/off.
  const [selfBookmarked, setSelfBookmarked] = useState(false);
  const isOn = bookmarked ?? selfBookmarked; // ?? = "use `bookmarked` unless it's missing"

  const handleClick = (event) => {
    // Only self-toggle when uncontrolled; when a parent owns `bookmarked`, its value wins.
    if (bookmarked === undefined) setSelfBookmarked((prev) => !prev);
    onClick?.(event);
  };

  return (
    <button
      className={`action-btn bookmark-button ${className}`.trim()}
      onClick={handleClick}
      aria-pressed={isOn}
      aria-label={isOn ? "Remove bookmark" : "Save"}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill={isOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      <span className="bookmark-button__label">{isOn ? "Saved" : "Save"}</span>
    </button>
  );
}

export default BookmarkButton;
