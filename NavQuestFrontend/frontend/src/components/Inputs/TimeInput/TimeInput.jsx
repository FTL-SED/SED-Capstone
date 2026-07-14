import './TimeInput.css'

function TimeInput({ label, value, onChange }) {
  return (
    <div>
      {label && <label>{label}</label>}
      <input type="time" value={value} onChange={onChange} />
    </div>
  );
}

export default TimeInput;
