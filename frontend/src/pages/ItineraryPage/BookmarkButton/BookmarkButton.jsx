import './BookmarkButton.css'

function BookmarkButton({ onClick }) {
  return (
    <button className="action-btn bookmark-button" onClick={onClick}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
      </svg>
      Bookmark
    </button>
  );
}

export default BookmarkButton;
