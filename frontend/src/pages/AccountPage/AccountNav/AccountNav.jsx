import ProfileButton from './ProfileButton/ProfileButton.jsx'
import LogOutButton from './LogOutButton/LogOutButton.jsx'
import './AccountNav.css'

function AccountNav({ setCurrentUser }) {
  return (
    <nav className="account-nav">
      <ProfileButton />
      <LogOutButton setCurrentUser={setCurrentUser} />
    </nav>
  );
}

export default AccountNav;
