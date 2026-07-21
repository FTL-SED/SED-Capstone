import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import PasswordInput from '../../../components/Inputs/PasswordInput/PasswordInput.jsx'
import UpdatePasswordButton from './UpdatePasswordButton/UpdatePasswordButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'
import { useState } from 'react'
import { changePassword } from '../../../api/users.js'
import './ChangePasswordSection.css'

function ChangePasswordSection({ currentUser }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Verify the current password on the backend, then update to the new one.
  // The backend re-checks the old password before changing it, so a stale
  // session can't silently reset the password.
  const handleUpdate = async () => {
    setError("");
    setMessage("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentUser.id, oldPassword, newPassword);
      setMessage("Password updated.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="change-password-section">
      <SectionHeader title="Change Password" />
      <PasswordInput
        label="Old password"
        value={oldPassword}
        onChange={(e) => setOldPassword(e.target.value)}
      />
      <PasswordInput
        label="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <PasswordInput
        label="Confirm new password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <ErrorMessage message={error} />
      {message && <p className="change-password-section__success">{message}</p>}
      <UpdatePasswordButton onClick={handleUpdate} loading={loading} />
    </section>
  );
}

export default ChangePasswordSection;
