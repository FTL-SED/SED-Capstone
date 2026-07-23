import './Step2_Members.css'
import { useState } from 'react'
import MemberCard from '../MemberCard/MemberCard.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'
import BackButton from '../../../components/Inputs/BackButton/BackButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'
import { newMember } from '../memberModel.js'

// Every member the backend accepts (validateRecommendationInput) needs a
// non-empty name and a starting location resolved to coordinates (the address
// picker sets `location` to { label, latitude, longitude }). Interests and food
// prefs are optional. Returns a message naming the first offending member.
function validateMembers(members) {
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    if (!m.name?.trim()) return `Please enter a name for Member ${i + 1}.`;
    if (!m.location) return `Please choose a starting location for Member ${i + 1}.`;
  }
  return '';
}

// The group's members. Each member has a name, one starting location, and their
// own interests + food prefs. Add/remove members inline.
// See .claude/roadmap/frontend-backend-integration.md (per-member restructure).
function Step2_Members({ form, update, onNext, onBack }) {
  const members = form.members;
  // Only advance once every member has the required name + location.
  const [error, setError] = useState('');

  const handleNext = () => {
    const message = validateMembers(members);
    setError(message);
    if (!message) onNext();
  };

  const updateMember = (index, next) => {
    update('members', members.map((m, i) => (i === index ? next : m)));
  };

  const addMember = () => update('members', [...members, newMember()]);

  const removeMember = (index) => {
    update('members', members.filter((_, i) => i !== index));
  };

  return (
    <div className="step2-members">
      <h2>Members</h2>
      <div className="step2-members__list">
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
      <button type="button" className="step2-members__add" onClick={addMember}>
        + Add member
      </button>
      <ErrorMessage message={error} />
      <div className="step2-members__nav">
        <BackButton onClick={onBack} />
        <NextButton onClick={handleNext} />
      </div>
    </div>
  );
}

export default Step2_Members;
