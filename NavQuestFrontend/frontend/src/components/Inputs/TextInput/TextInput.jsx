import './TextInput.css'

function TextInput({ label, placeholder, value, onChange, type = "text" }) {
  return (
    <div>
      {label && <label>{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export default TextInput;
