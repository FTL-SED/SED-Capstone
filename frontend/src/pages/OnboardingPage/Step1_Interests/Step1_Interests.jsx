import './Step1_Interests.css'
import TagPills from '../../../components/Inputs/TagPills/TagPills.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'
import { INTEREST_TAGS } from '../../../api/vocab.js'

// Onboarding step 1: the user's interests. Optional — a user can skip picking
// any and still continue (prefs are a starting point, editable later), so this
// step never blocks Next. All options are shown (no "View more" collapse).
function Step1_Interests({ form, update, onNext }) {
  return (
    <div className="onboarding-step">
      <h2 className="onboarding-step__title">What are you into?</h2>
      <p className="onboarding-step__hint">Choose the experiences you'd enjoy most, we'll do the rest.</p>

      <TagPills
        options={INTEREST_TAGS}
        selected={form.interestTags}
        onChange={(next) => update('interestTags', next)}
        groupLabel="interests"
      />

      <div className="onboarding-step__nav onboarding-step__nav--end">
        <NextButton onClick={onNext} />
      </div>
    </div>
  )
}

export default Step1_Interests
