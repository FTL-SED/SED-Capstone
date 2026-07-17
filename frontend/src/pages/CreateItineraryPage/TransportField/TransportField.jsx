import './TransportField.css'

// Backend accepts these exact transport modes (config/ai.js TRAVEL_MPH_BY_MODE);
// a select keeps the value in that set instead of free text.
const TRANSPORT_OPTIONS = ['walking', 'biking', 'transit', 'driving'];

function TransportField({ form, update }) {
  return (
    <div className="transport-field">
      <h2>Preferred Transport</h2>
      <select
        value={form.transport}
        onChange={(e) => update('transport', e.target.value)}
      >
        <option value="">Select transportation</option>
        {TRANSPORT_OPTIONS.map((mode) => (
          <option key={mode} value={mode}>
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default TransportField;
