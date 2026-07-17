import './Tag.css'

function Tag({ label, onRemove }) {
  return (
    <span className="tag">
      {label}
      {onRemove && (
        <button type="button" className="tag__remove" onClick={onRemove} aria-label={`Remove ${label}`}>
          ×
        </button>
      )}
    </span>
  );
}

export default Tag;
