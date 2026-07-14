import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx';
import PasswordInput from '../../../components/Inputs/PasswordInput/PasswordInput.jsx';
import SubmitButton from '../../../components/Inputs/SubmitButton/SubmitButton.jsx';
import './LoginForm.css'

function LoginForm() {
  return (
    <form>
      <TextInput placeholder="Email" type="email" />
      <PasswordInput placeholder="Password" />
      <SubmitButton label="Log in" />
    </form>
  );
}

export default LoginForm;
