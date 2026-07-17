import './TagPills.css'

// Click-to-toggle pills for choosing from a fixed set of options (e.g. the
// engine's interest/food vocab). Clearer and more discoverable than a dropdown:
// every option is visible and selection is one tap.
//   options:  string[] of choices
//   selected: string[] currently chosen
//   onChange: (nextSelected) => void
// See .claude/roadmap/frontend-backend-integration.md.
function TagPills({ options = [], selected = [], onChange }) {
  const toggle = (option) => {
    const isOn = selected.includes(option);
    onChange(isOn ? selected.filter((o) => o !== option) : [...selected, option]);
  };

  return (
    <div className="tag-pills" role="group">
      {options.map((option) => {
        const isOn = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            className={`tag-pill${isOn ? ' tag-pill--on' : ''}`}
            aria-pressed={isOn}
            onClick={() => toggle(option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export default TagPills;
