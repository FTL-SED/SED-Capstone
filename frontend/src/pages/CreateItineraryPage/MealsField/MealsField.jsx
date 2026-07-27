import './MealsField.css'

// Optional toggle: whether the generated day should include meal stops
// (breakfast/lunch/dinner). Defaults ON; turning it off tells the backend to
// sequence activities only. Mirrors the TransportField pill styling.
function MealsField({ form, update }) {
  const include = form.includeMeals !== false;

  return (
    <div className="meals-field">
      <h2>Meals <span className="field-optional">(optional)</span></h2>
      <div className="meals-field__options" role="group" aria-label="Include meals">
        <button
          type="button"
          className={`meals-pill${include ? ' meals-pill--selected' : ''}`}
          aria-pressed={include}
          onClick={() => update('includeMeals', true)}
        >
          Include meals
        </button>
        <button
          type="button"
          className={`meals-pill${!include ? ' meals-pill--selected' : ''}`}
          aria-pressed={!include}
          onClick={() => update('includeMeals', false)}
        >
          No meals
        </button>
      </div>
    </div>
  );
}

export default MealsField;
