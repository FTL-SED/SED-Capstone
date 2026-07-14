import './TravelRadiusField.css'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'

function TravelRadiusField() {
  return (
    <div>
      <h2>Max Travel Radius</h2>
      <TextInput placeholder="Enter maximum group travel distance" />
    </div>
  );
}

export default TravelRadiusField;
