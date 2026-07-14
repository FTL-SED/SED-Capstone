import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import PasswordInput from '../../../components/Inputs/PasswordInput/PasswordInput.jsx'
import UpdatePasswordButton from './UpdatePasswordButton/UpdatePasswordButton.jsx'
import './ChangePasswordSection.css'

function ChangePasswordSection() {
  return (
    <section>
      <SectionHeader title="Change Password" />
      <PasswordInput label="Old password" />
      <PasswordInput label="New password" />
      <PasswordInput label="Confirm new password" />
      <UpdatePasswordButton />
    </section>
  );
}

export default ChangePasswordSection;
