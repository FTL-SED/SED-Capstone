import ProfileButton from './ProfileButton/ProfileButton.jsx'
import LogOutButton from './LogOutButton/LogOutButton.jsx'
import './AccountNav.css'

function AccountNav() {
  return (
    <nav>
      <ProfileButton />
      <LogOutButton />
    </nav>
  );
}

export default AccountNav;
