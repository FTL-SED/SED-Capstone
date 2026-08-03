import './PrivacyField.css'

// Whether the finished itinerary is visible to others. Uses the app's segmented
// pill pattern (mirrors MealsField / TransportField) instead of a bare native
// select, so it reads on-theme with the rest of the Create flow.
function PrivacyField({ form, update }) {
  const isPublic = Boolean(form.isPublic);

  return (
    <div className="privacy-field">
      <label className="privacy-field__label">Visibility</label>
      <div className="privacy-field__options" role="group" aria-label="Itinerary visibility">
        <button
          type="button"
          className={`privacy-pill${!isPublic ? ' privacy-pill--selected' : ''}`}
          aria-pressed={!isPublic}
          onClick={() => update('isPublic', false)}
        >
          Private
        </button>
        <button
          type="button"
          className={`privacy-pill${isPublic ? ' privacy-pill--selected' : ''}`}
          aria-pressed={isPublic}
          onClick={() => update('isPublic', true)}
        >
          Public
        </button>
      </div>
    </div>
  );
}

export default PrivacyField;
