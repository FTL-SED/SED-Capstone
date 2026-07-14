import './TagList.css'
import Tag from '../Tag/Tag.jsx'

function TagList({ tags = [] }) {
  return (
    <div>
      {tags.map((tag, index) => (
        <Tag key={index} label={tag} />
      ))}
    </div>
  );
}

export default TagList;
