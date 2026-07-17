import './TagInput.css'
import { useId, useState } from 'react'
import DropdownInput from '../DropdownInput/DropdownInput.jsx'
import TagList from '../TagList/TagList.jsx'

// Controlled multi-value input. `tags` is the current array; `onChange(next)`
// is called with the updated array. Type a value and press Enter to add it;
// click a tag to remove it. Pass `suggestions` to offer a native datalist of
// recognized values (guides users to the engine's vocab — Step 10) without
// hard-blocking free text. See the integration roadmap (Steps 5, 10).
function TagInput({ label, placeholder, tags = [], onChange, suggestions }) {
  const [text, setText] = useState('');
  const listId = useId();
  // Only suggest values not already picked.
  const options = suggestions?.filter((s) => !tags.includes(s));

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
        listId={options ? listId : undefined}
      />
      {options && (
        <datalist id={listId}>
          {options.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      <TagList tags={tags} onRemove={onChange ? removeTag : undefined} />
    </div>
  );
}

export default TagInput;
