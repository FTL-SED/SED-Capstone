import ProfileButton from './ProfileButton/ProfileButton.jsx'
import LogOutButton from './LogOutButton/LogOutButton.jsx'
import './AccountNav.css'

function AccountNav({ setCurrentUser, onTogglePreferences, preferencesOpen }) {
  return (
    <nav className="account-nav">
      <ProfileButton onClick={onTogglePreferences} expanded={preferencesOpen} />
      <LogOutButton setCurrentUser={setCurrentUser} />
    </nav>
  );
}

export default AccountNav;
