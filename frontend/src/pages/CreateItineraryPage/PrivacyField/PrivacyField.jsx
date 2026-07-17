import './PrivacyField.css'

function PrivacyField({ form, update }) {
  return (
    <div className="privacy-field">
      <label>Private/Public</label>
      <select
        value={form.isPublic ? 'public' : 'private'}
        onChange={(e) => update('isPublic', e.target.value === 'public')}
      >
        <option value="private">Private</option>
        <option value="public">Public</option>
      </select>
    </div>
  );
}

export default PrivacyField;
