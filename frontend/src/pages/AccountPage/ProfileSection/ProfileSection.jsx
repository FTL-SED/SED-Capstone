import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import UsernameField from './UsernameField/UsernameField.jsx'
import EmailField from './EmailField/EmailField.jsx'
import './ProfileSection.css'

function ProfileSection({ currentUser }) {
  return (
    <section className="profile-section">
      <SectionHeader title="Profile" />
      <UsernameField username={currentUser?.username} />
      <EmailField email={currentUser?.email} />
    </section>
  );
}

export default ProfileSection;
