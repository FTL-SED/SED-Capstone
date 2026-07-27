import './VisitedButton.css'

// "I've been here" action. One-way for now: once visited, it shows the marked
// state and disables (there's no un-mark endpoint yet — see the design spec).
function VisitedButton({ visited = false, onClick }) {
  return (
    <button
      type="button"
      className={`action-btn visited-button${visited ? ' visited-button--on' : ''}`}
      onClick={onClick}
      disabled={visited}
      aria-pressed={visited}
      aria-label={visited ? 'Marked as visited' : "Mark as visited (I've been here)"}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {visited ? 'Visited' : "I've been here"}
    </button>
  );
}

export default VisitedButton;
