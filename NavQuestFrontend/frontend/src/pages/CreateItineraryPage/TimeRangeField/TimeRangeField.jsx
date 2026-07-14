import './TimeRangeField.css'
import TimeInput from '../../../components/Inputs/TimeInput/TimeInput.jsx'

function TimeRangeField() {
  return (
    <div className="time-range-field">
      <h2>Time Range</h2>
      <TimeInput label="Start Time" />
      <TimeInput label="End Time" />
    </div>
  );
}

export default TimeRangeField;
