import './VisitedButton.css'

// "Visited" toggle. Clicking marks the itinerary as visited; clicking again
// un-marks it (both hit the backend). When visited it shows the filled state;
// otherwise it invites the action.
function VisitedButton({ visited = false, onClick }) {
  return (
    <button
      type="button"
      className={`action-btn visited-button${visited ? ' visited-button--on' : ''}`}
      onClick={onClick}
      aria-pressed={visited}
      aria-label={visited ? 'Remove from visited' : 'Mark as visited'}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      Visited
    </button>
  );
}

export default VisitedButton;
