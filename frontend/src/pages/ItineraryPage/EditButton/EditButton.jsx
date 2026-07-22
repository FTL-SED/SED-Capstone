import './EditButton.css'

// `active` = the itinerary is in edit mode; the button becomes a "Done" toggle.
function EditButton({ onClick, active = false }) {
  return (
    <button
      className={`action-btn edit-button${active ? ' edit-button--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {active ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      )}
      {active ? 'Done' : 'Edit'}
    </button>
  );
}

export default EditButton;
