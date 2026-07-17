import './TagInput.css'
import { useState } from 'react'
import DropdownInput from '../DropdownInput/DropdownInput.jsx'
import TagList from '../TagList/TagList.jsx'

// Controlled multi-value input. `tags` is the current array; `onChange(next)`
// is called with the updated array. Type a value and press Enter to add it;
// click a tag to remove it. See the integration roadmap (Step 5).
function TagInput({ label, placeholder, tags = [], onChange }) {
  const [text, setText] = useState('');

  const addTag = () => {
    const value = text.trim().toLowerCase();
    if (value && !tags.includes(value)) {
      onChange?.([...tags, value]);
    }
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (tag) => {
    onChange?.(tags.filter((t) => t !== tag));
  };

  return (
    <div className="tag-input">
      {label && <label>{label}</label>}
      <DropdownInput
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <TagList tags={tags} onRemove={onChange ? removeTag : undefined} />
    </div>
  );
}

export default TagInput;
