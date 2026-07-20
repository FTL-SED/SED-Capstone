import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import EmailField from './EmailField/EmailField.jsx'
import './ProfileSection.css'

function ProfileSection({ currentUser }) {
  return (
    <section className="profile-section">
      <SectionHeader title="Profile" />
      <EmailField email={currentUser?.email} />
    </section>
  );
}

export default ProfileSection;
