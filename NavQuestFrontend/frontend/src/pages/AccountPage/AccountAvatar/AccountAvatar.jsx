import AvatarUploadButton from './AvatarUploadButton/AvatarUploadButton.jsx'
import './AccountAvatar.css'

function AccountAvatar() {
  return (
    <div className="account-avatar">
      <img className="account-avatar__img" alt="avatar" />
      <AvatarUploadButton />
    </div>
  );
}

export default AccountAvatar;
