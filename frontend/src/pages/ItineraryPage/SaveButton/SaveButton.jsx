import './SaveButton.css'

function SaveButton({ onClick }) {
  return (
    <button className="action-btn save-button" onClick={onClick}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Save
    </button>
  );
}

export default SaveButton;
