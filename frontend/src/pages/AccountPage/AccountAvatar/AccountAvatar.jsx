import AvatarUploadButton from './AvatarUploadButton/AvatarUploadButton.jsx'
import { useState } from 'react'
import { uploadAvatar } from '../../../api/users.js'
import accountIcon from '../../../assets/account_icon.png'
import './AccountAvatar.css'

function AccountAvatar({ currentUser, setCurrentUser }) {
  const [uploading, setUploading] = useState(false);

  // Send the chosen file to the backend, which uploads it to the `avatars`
  // bucket and returns the saved profile (with its new avatarUrl). We fold that
  // into currentUser so the new image shows everywhere and survives a refresh.
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    setUploading(true);
    try {
      const data = await uploadAvatar(currentUser.id, formData);
      setCurrentUser({ ...currentUser, avatarUrl: data.avatarUrl });
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="account-avatar">
      <img
        className="account-avatar__img"
        src={currentUser?.avatarUrl || accountIcon}
        alt="avatar"
      />
      <AvatarUploadButton onFileSelected={handleFileSelected} uploading={uploading} />
    </div>
  );
}

export default AccountAvatar;
