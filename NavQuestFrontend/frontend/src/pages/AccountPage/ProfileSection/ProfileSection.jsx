import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import UsernameField from './UsernameField/UsernameField.jsx'
import EmailField from './EmailField/EmailField.jsx'
import './ProfileSection.css'

function ProfileSection() {
  return (
    <section className="profile-section">
      <SectionHeader title="Profile" />
      <UsernameField />
      <EmailField />
    </section>
  );
}

export default ProfileSection;
