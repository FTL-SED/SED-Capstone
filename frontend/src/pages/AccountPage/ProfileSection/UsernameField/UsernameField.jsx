import SectionHeader from '../../../../components/SectionHeader/SectionHeader.jsx'
import TextInput from '../../../../components/Inputs/TextInput/TextInput.jsx'
import ErrorMessage from '../../../../components/ErrorMessage/ErrorMessage.jsx'
import { useState } from 'react'
import { updateUsername } from '../../../../api/users.js'
import './UsernameField.css'

// Change-username section: shows the current username (read-only) and takes a
// new one. Saving PUTs to the backend (which owns the uniqueness check) and
// folds the returned profile into currentUser so the new name shows everywhere
// and survives a refresh.
function UsernameField({ currentUser, setCurrentUser }) {
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError("");
    setMessage("");

    const trimmed = newUsername.trim();
    if (!trimmed) {
      setError("Please enter a new username.");
      return;
    }
    if (trimmed === currentUser?.username) {
      setError("That's already your username.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateUsername(currentUser.id, trimmed);
      setCurrentUser({ ...currentUser, username: updated.username });
      setMessage("Username updated.");
      setNewUsername("");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="change-username-section">
      <SectionHeader title="Change Username" />
      <TextInput
        label="Current username"
        value={currentUser?.username ?? ""}
        readOnly
      />
      <TextInput
        label="New username"
        value={newUsername}
        onChange={(e) => setNewUsername(e.target.value)}
      />
      <ErrorMessage message={error} />
      {message && <p className="change-username-section__success">{message}</p>}
      <button
        className="change-username-section__save"
        type="button"
        onClick={handleSave}
        disabled={saving}>
          {saving ? "Updating..." : "Update username"}
      </button>
    </section>
  );
}

export default UsernameField;
