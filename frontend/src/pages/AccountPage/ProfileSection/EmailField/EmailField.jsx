import TextInput from '../../../../components/Inputs/TextInput/TextInput.jsx'
import './EmailField.css'

function EmailField() {
  return (
    <TextInput label="Email" type="email" value="example@codepath.org" readOnly />
  );
}

export default EmailField;
