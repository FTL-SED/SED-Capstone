import './TransportField.css'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'

function TransportField() {
  return (
    <div className="transport-field">
      <h2>Preferred Transport</h2>
      <TextInput placeholder="Enter group preferred transportation" />
    </div>
  );
}

export default TransportField;
