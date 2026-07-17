import './BookmarkButton.css'
import { useState } from 'react'
import notBookmarkedIcon from '../../../assets/not_bookmarked_button.png'
import bookmarkedIcon from '../../../assets/bookmarked_button.png'

function BookmarkButton({ onClick, className = "", bookmarked }) {
  // If a parent passes `bookmarked`, we show that. If not, we track our own on/off.
  const [selfBookmarked, setSelfBookmarked] = useState(false);
  const isOn = bookmarked ?? selfBookmarked; // ?? = "use `bookmarked` unless it's missing"

  const handleClick = (event) => {
    // Ignored on the home page (the parent's `bookmarked` wins), matters on ItineraryPage.
    setSelfBookmarked((prev) => !prev);
    onClick?.(event);
  };

  return (
    <button
      className={`bookmark-button ${className}`.trim()}
      onClick={handleClick}
      aria-pressed={isOn}
      aria-label={isOn ? "Remove bookmark" : "Bookmark"}
    >
      <img src={isOn ? bookmarkedIcon : notBookmarkedIcon} alt="" />
    </button>
  );
}

export default BookmarkButton;
