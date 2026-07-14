import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'
import PasswordInput from '../../../components/Inputs/PasswordInput/PasswordInput.jsx'
import SubmitButton from '../../../components/Inputs/SubmitButton/SubmitButton.jsx'
import './RegisterForm.css'

function RegisterForm() {
  return (
    <form>
      <TextInput placeholder="Email" type="email" />
      <TextInput placeholder="Username" />
      <PasswordInput placeholder="Password" />
      <SubmitButton label="Sign Up" />
    </form>
  );
}

export default RegisterForm;
