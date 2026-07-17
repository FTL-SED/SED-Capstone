import './TagList.css'
import Tag from '../Tag/Tag.jsx'

function TagList({ tags = [], onRemove }) {
  return (
    <div className="tag-list">
      {tags.map((tag, index) => (
        <Tag key={index} label={tag} onRemove={onRemove ? () => onRemove(tag) : undefined} />
      ))}
    </div>
  );
}

export default TagList;
