import './PasswordInput.css'

function PasswordInput({ label, placeholder = "Password", value, onChange }) {
  return (
    <div>
      {label && <label>{label}</label>}
      <input
        type="password"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export default PasswordInput;
