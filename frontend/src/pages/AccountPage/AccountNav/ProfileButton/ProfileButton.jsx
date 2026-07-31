import './ProfileButton.css'

// Opens the saved-preferences editor on the account page. `expanded` reflects
// whether the editor is currently open (for aria + label), `onClick` toggles it.
function ProfileButton({ onClick, expanded = false }) {
  return (
    <button
      className="profile-button"
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
    >
      {expanded ? 'Hide preferences' : 'Preferences'}
    </button>
  );
}

export default ProfileButton;
