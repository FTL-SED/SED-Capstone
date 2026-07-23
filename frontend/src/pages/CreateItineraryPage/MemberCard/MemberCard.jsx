import './MemberCard.css'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'
import AddressPicker from '../../../components/Inputs/AddressPicker/AddressPicker.jsx'
import TagPills from '../../../components/Inputs/TagPills/TagPills.jsx'
import { INTEREST_TAGS, CUISINE_TAGS, DIET_TAGS } from '../../../api/vocab.js'

// How many pills each long group shows before "View more".
const COLLAPSED = 8

// One member's inputs: name, a single starting location, and their interests +
// food prefs. `member` is { name, location, interestTags, foodPrefs };
// `onChange(next)` replaces the whole member object. foodPrefs stays a single
// flat array (cuisines + diets) so the request payload is unchanged — the two
// food groups below just edit disjoint slices of that one array.
function MemberCard({ index, member, onChange, onRemove }) {
  const set = (field, value) => onChange({ ...member, [field]: value });

  // Slices foodPrefs into cuisine vs diet. Assumes foodPrefs contains ONLY tags
  // from these two vocabs — any other tag would be silently dropped on edit.
  const cuisineSel = member.foodPrefs.filter((t) => CUISINE_TAGS.includes(t));
  const dietSel = member.foodPrefs.filter((t) => DIET_TAGS.includes(t));

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
        collapsedCount={COLLAPSED}
        groupLabel="interests"
      />

      <label className="member-card__label">Food preferences</label>
      <span className="member-card__sublabel">Cuisines</span>
      <TagPills
        options={CUISINE_TAGS}
        selected={cuisineSel}
        onChange={(next) => set('foodPrefs', [...next, ...dietSel])}
        collapsedCount={COLLAPSED}
        groupLabel="cuisines"
      />
      <span className="member-card__sublabel">Dietary</span>
      <TagPills
        options={DIET_TAGS}
        selected={dietSel}
        onChange={(next) => set('foodPrefs', [...cuisineSel, ...next])}
        groupLabel="dietary needs"
      />
    </div>
  );
}

export default MemberCard;
