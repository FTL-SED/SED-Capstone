import './Step2_Members.css'
import { useState } from 'react'
import MemberCard from '../MemberCard/MemberCard.jsx'
import UserSearch from '../UserSearch/UserSearch.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'
import BackButton from '../../../components/Inputs/BackButton/BackButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'
import { newMember, memberFromUser } from '../memberModel.js'

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
  // Food prefs only matter when the day includes meals; hide them otherwise.
  const showFoodPrefs = form.includeMeals !== false;
  // Only advance once every member has the required name + location.
  const [error, setError] = useState('');
  // The username-search box is revealed on demand, next to "+ Add member".
  const [showSearch, setShowSearch] = useState(false);

  const handleNext = () => {
    const message = validateMembers(members);
    setError(message);
    if (!message) onNext();
  };

  const updateMember = (index, next) => {
    update('members', members.map((m, i) => (i === index ? next : m)));
  };

  const addMember = () => update('members', [...members, newMember()]);

  // Add a member pre-filled from a public user's saved preferences. The snapshot
  // is an independent copy — editing this member never touches that user's
  // account. The search box stays open so several users can be added in a row.
  const addMemberFromUser = (userSnapshot) => {
    update('members', [...members, memberFromUser(userSnapshot)]);
  };

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
            showFoodPrefs={showFoodPrefs}
          />
        ))}
      </div>
      <div className="step2-members__actions">
        <button type="button" className="step2-members__add" onClick={addMember}>
          + Add member
        </button>
        <button
          type="button"
          className="step2-members__add step2-members__search-toggle"
          onClick={() => setShowSearch((v) => !v)}
          aria-expanded={showSearch}
        >
          {showSearch ? 'Close search' : 'Search by username'}
        </button>
      </div>

      {showSearch && (
        <div className="step2-members__search">
          <p className="step2-members__search-hint">
            Find a public user to add as a member — their saved preferences are
            copied in and can be edited without affecting their account.
          </p>
          <UserSearch onSelect={addMemberFromUser} />
        </div>
      )}

      <ErrorMessage message={error} />
      <div className="step2-members__nav">
        <BackButton onClick={onBack} />
        <NextButton onClick={handleNext} />
      </div>
    </div>
  );
}

export default Step2_Members;
