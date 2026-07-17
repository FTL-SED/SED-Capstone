import AvatarUploadButton from './AvatarUploadButton/AvatarUploadButton.jsx'
import { useState } from 'react'
import axios from 'axios'
import accountIcon from '../../../assets/account_icon.png'
import './AccountAvatar.css'

const BASE_URL = import.meta.env.VITE_BASE_URL;

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
      const response = await axios.post(
        `${BASE_URL}/users/${currentUser.id}/avatar`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      setCurrentUser({ ...currentUser, avatarUrl: response.data.avatarUrl });
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
