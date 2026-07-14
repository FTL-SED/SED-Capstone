import './TagInput.css'
import DropdownInput from '../DropdownInput/DropdownInput.jsx'
import TagList from '../TagList/TagList.jsx'

function TagInput({ label, placeholder, tags = [] }) {
  return (
    <div className="tag-input">
      {label && <label>{label}</label>}
      <DropdownInput placeholder={placeholder} />
      <TagList tags={tags} />
    </div>
  );
}

export default TagInput;
