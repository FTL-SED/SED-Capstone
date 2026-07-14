import './DropdownInput.css'

function DropdownInput({ placeholder, value, onChange }) {
  return (
    <input
      className="dropdown-input"
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  );
}

export default DropdownInput;
