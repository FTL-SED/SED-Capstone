import './Step3_Members.css'
import MemberCard from '../MemberCard/MemberCard.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'
import { newMember } from '../memberModel.js'

// The group's members. Each member has a name, one starting location, and their
// own interests + food prefs. Add/remove members inline.
// See .claude/roadmap/frontend-backend-integration.md (per-member restructure).
function Step3_Members({ form, update, onNext }) {
  const members = form.members;

  const updateMember = (index, next) => {
    update('members', members.map((m, i) => (i === index ? next : m)));
  };

  const addMember = () => update('members', [...members, newMember()]);

  const removeMember = (index) => {
    update('members', members.filter((_, i) => i !== index));
  };

  return (
    <div className="step3-members">
      <h2>Members</h2>
      <div className="step3-members__list">
        {members.map((member, i) => (
          <MemberCard
            key={i}
            index={i}
            member={member}
            onChange={(next) => updateMember(i, next)}
            onRemove={members.length > 1 ? () => removeMember(i) : undefined}
          />
        ))}
      </div>
      <button type="button" className="step3-members__add" onClick={addMember}>
        + Add member
      </button>
      <NextButton onClick={onNext} />
    </div>
  );
}

export default Step3_Members;
