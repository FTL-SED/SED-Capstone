import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import EmailField from './EmailField/EmailField.jsx'
import PrivacyButton from '../../ItineraryPage/PrivacyButton/PrivacyButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'
import { usePreferencesQuery, useTogglePublic } from '../../../hooks/usePreferences.js'
import './ProfileSection.css'

// Profile section: read-only email plus a public/private visibility toggle.
// Only public profiles appear in user search (add-group-member-by-username), so
// this is the control that opts a user in/out. The toggle is OPTIMISTIC — it
// flips the shared prefs cache immediately (instant UI, exactly like the
// itinerary page's privacy button) and converges the server in the background.
function ProfileSection({ currentUser }) {
  const { data: prefs, isError } = usePreferencesQuery(currentUser?.id)
  const togglePublic = useTogglePublic(currentUser?.id)

  const isPublic = prefs?.isPublic ?? null // null until loaded

  const handleToggle = () => {
    if (isPublic === null) return
    togglePublic(!isPublic)
  }

  return (
    <section className="profile-section">
      <SectionHeader title="Profile" />
      <EmailField email={currentUser?.email} />

      <div className="profile-section__privacy">
        <div className="profile-section__privacy-copy">
          <span className="profile-section__privacy-label">Profile visibility</span>
          <p className="profile-section__privacy-hint">
            {isPublic
              ? 'Public — others can find you by username and add you to a group trip.'
              : 'Private — you won’t appear in user search.'}
          </p>
        </div>
        {isPublic !== null && (
          <PrivacyButton isPublic={isPublic} onClick={handleToggle} />
        )}
      </div>
      {isError && <ErrorMessage message="Could not load your privacy setting." />}
    </section>
  );
}

export default ProfileSection;
