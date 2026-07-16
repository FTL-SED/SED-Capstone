import TextInput from '../../../../components/Inputs/TextInput/TextInput.jsx'
import './UsernameField.css'

function UsernameField({ username }) {
  return (
    <TextInput label="Username" value={username ?? ""} readOnly />
  );
}

export default UsernameField;
