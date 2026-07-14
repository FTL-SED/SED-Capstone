import AccountAvatar from './AccountAvatar/AccountAvatar.jsx'
import AccountNav from './AccountNav/AccountNav.jsx'
import ProfileSection from './ProfileSection/ProfileSection.jsx'
import ChangePasswordSection from './ChangePasswordSection/ChangePasswordSection.jsx'
import './AccountPage.css'

function AccountPage() {
  return (
    <div>
      <div>
        <AccountAvatar />
        <AccountNav />
      </div>
      <div>
        <ProfileSection />
        <ChangePasswordSection />
      </div>
    </div>
  );
}

export default AccountPage;
