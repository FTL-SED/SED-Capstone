import './DropdownInput.css'

function DropdownInput({ placeholder, value, onChange, onKeyDown, listId }) {
  return (
    <input
      className="dropdown-input"
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      list={listId}
    />
  );
}

export default DropdownInput;
