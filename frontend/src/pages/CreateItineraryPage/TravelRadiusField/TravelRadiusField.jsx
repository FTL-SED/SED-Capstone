import './TravelRadiusField.css'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'

function TravelRadiusField({ form, update }) {
  return (
    <div className="travel-radius-field">
      <h2>Max Travel Radius</h2>
      <TextInput
        placeholder="Enter maximum group travel distance (miles)"
        type="number"
        value={form.travelRadius}
        onChange={(e) => update('travelRadius', e.target.value)}
      />
    </div>
  );
}

export default TravelRadiusField;
