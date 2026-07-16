import TextInput from '../../../../components/Inputs/TextInput/TextInput.jsx'
import './EmailField.css'

function EmailField({ email }) {
  return (
    <TextInput label="Email" type="email" value={email ?? ""} readOnly />
  );
}

export default EmailField;
