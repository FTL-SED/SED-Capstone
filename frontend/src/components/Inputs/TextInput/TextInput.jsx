import './TextInput.css'

function TextInput({ label, placeholder, value, onChange, type = "text", readOnly = false }) {
  return (
    <div className="text-input">
      {label && <label>{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
      />
    </div>
  );
}

export default TextInput;
