import './ItineraryDetailsPreview.css'

// Review summary of everything the user entered, shown on the Finish step.
// Each section has an "Edit" link that jumps back to the step that owns it
// (goTo(1) = Trip Basics, goTo(2) = Members), so users can revise before
// generating. `form` is the wizard state; `goTo(step)` switches steps.
function ItineraryDetailsPreview({ form, goTo }) {
  const timeRange =
    form.startTime && form.endTime ? `${form.startTime} – ${form.endTime}` : 'Not set';

  return (
    <div className="itinerary-details-preview">
      <div className="details-section">
        <div className="details-section__head">
          <h3>Trip</h3>
          <button type="button" className="details-section__edit" onClick={() => goTo(1)}>
            Edit
          </button>
        </div>
        <dl className="details-list">
          <div><dt>Time</dt><dd>{timeRange}</dd></div>
          <div><dt>Transport</dt><dd>{form.transport || 'Any'}</dd></div>
          <div><dt>Travel radius</dt><dd>{form.travelRadius ? `${form.travelRadius} mi` : 'No limit'}</dd></div>
          <div><dt>Budget</dt><dd>{form.budget ? `$${form.budget}/person` : 'Not set'}</dd></div>
        </dl>
      </div>

      <div className="details-section">
        <div className="details-section__head">
          <h3>Members ({form.members.length})</h3>
          <button type="button" className="details-section__edit" onClick={() => goTo(2)}>
            Edit
          </button>
        </div>
        <ul className="details-members">
          {form.members.map((m, i) => (
            <li key={i} className="details-member">
              <span className="details-member__name">{m.name?.trim() || `Member ${i + 1}`}</span>
              <span className="details-member__meta">
                {m.location?.label || 'No location'}
                {m.interestTags.length > 0 && ` · ${m.interestTags.join(', ')}`}
                {m.foodPrefs.length > 0 && ` · ${m.foodPrefs.join(', ')}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ItineraryDetailsPreview;
