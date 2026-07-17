import './PrivacyField.css'

function PrivacyField() {
  return (
    <div className="privacy-field">
      <label>Private/Public</label>
      <select>
        <option>Private</option>
        <option>Public</option>
      </select>
    </div>
  );
}

export default PrivacyField;
