import './MemberCard.css'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'
import AddressPicker from '../../../components/Inputs/AddressPicker/AddressPicker.jsx'
import TagPills from '../../../components/Inputs/TagPills/TagPills.jsx'
import { INTEREST_TAGS, FOOD_TAGS } from '../../../api/vocab.js'

// One member's inputs: name, a single starting location, and their interests +
// food prefs. `member` is { name, location, interestTags, foodPrefs };
// `onChange(next)` replaces the whole member object.
function MemberCard({ index, member, onChange, onRemove }) {
  const set = (field, value) => onChange({ ...member, [field]: value });

  return (
    <div className="member-card">
      <div className="member-card__header">
        <h3>Member {index + 1}</h3>
        {onRemove && (
          <button type="button" className="member-card__remove" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>

      <TextInput
        placeholder="Name"
        value={member.name}
        onChange={(e) => set('name', e.target.value)}
      />

      <label className="member-card__label">Starting location</label>
      <AddressPicker
        placeholder="Enter this member's starting location"
        value={member.location}
        onChange={(loc) => set('location', loc)}
      />

      <label className="member-card__label">Interests</label>
      <TagPills
        options={INTEREST_TAGS}
        selected={member.interestTags}
        onChange={(next) => set('interestTags', next)}
      />

      <label className="member-card__label">Food preferences</label>
      <TagPills
        options={FOOD_TAGS}
        selected={member.foodPrefs}
        onChange={(next) => set('foodPrefs', next)}
      />
    </div>
  );
}

export default MemberCard;
