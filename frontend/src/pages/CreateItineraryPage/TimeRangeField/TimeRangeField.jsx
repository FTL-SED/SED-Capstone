import './TimeRangeField.css'
import TimeInput from '../../../components/Inputs/TimeInput/TimeInput.jsx'

function TimeRangeField({ form, update }) {
  return (
    <div className="time-range-field">
      <h2>Time Range <span className="field-required" aria-label="required">*</span></h2>
      <TimeInput
        label="Start Time"
        value={form.startTime}
        onChange={(e) => update('startTime', e.target.value)}
      />
      <TimeInput
        label="End Time"
        value={form.endTime}
        onChange={(e) => update('endTime', e.target.value)}
      />
    </div>
  );
}

export default TimeRangeField;
