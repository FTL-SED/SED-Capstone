import './DropdownInput.css'

function DropdownInput({ placeholder, value, onChange, onKeyDown }) {
  return (
    <input
      className="dropdown-input"
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  );
}

export default DropdownInput;
