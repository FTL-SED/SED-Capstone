import './DateField.css'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'

// The calendar day the trip is planned for. A native date input gives us the
// YYYY-MM-DD string the backend expects for `tripDate` with no extra parsing.
function DateField({ form, update }) {
  return (
    <div className="date-field">
      <h2>Trip Date</h2>
      <TextInput
        type="date"
        value={form.tripDate}
        onChange={(e) => update('tripDate', e.target.value)}
      />
    </div>
  );
}

export default DateField;
