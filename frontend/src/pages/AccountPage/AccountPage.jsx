import AccountAvatar from './AccountAvatar/AccountAvatar.jsx'
import AccountNav from './AccountNav/AccountNav.jsx'
import ProfileSection from './ProfileSection/ProfileSection.jsx'
import ChangePasswordSection from './ChangePasswordSection/ChangePasswordSection.jsx'
import './AccountPage.css'

function AccountPage({ currentUser, setCurrentUser }) {
  return (
    <div className="account-page">
      <div className="account-page__aside">
        <AccountAvatar currentUser={currentUser} setCurrentUser={setCurrentUser} />
        <AccountNav setCurrentUser={setCurrentUser} />
      </div>
      <div className="account-page__main">
        <ProfileSection />
        <ChangePasswordSection />
      </div>
    </div>
  );
}

export default AccountPage;
