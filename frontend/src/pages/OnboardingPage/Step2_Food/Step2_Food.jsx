import './Step2_Food.css'
import TagPills from '../../../components/Inputs/TagPills/TagPills.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'
import BackButton from '../../../components/Inputs/BackButton/BackButton.jsx'
import { CUISINE_TAGS, DIET_TAGS } from '../../../api/vocab.js'

// Onboarding step 2: food preferences. Like MemberCard, cuisines + dietary needs
// are stored in ONE flat form.foodPrefs array; the two pill groups edit disjoint
// slices of it. Optional — never blocks Next. All options shown (no collapse).
function Step2_Food({ form, update, onNext, onBack }) {
  const cuisineSel = form.foodPrefs.filter((t) => CUISINE_TAGS.includes(t))
  const dietSel = form.foodPrefs.filter((t) => DIET_TAGS.includes(t))

  return (
    <div className="onboarding-step">
      <h2 className="onboarding-step__title">What kind of food do you enjoy?</h2>
      <p className="onboarding-step__hint">Favorite cuisines and any dietary needs.</p>

      <span className="onboarding-step__sublabel">Cuisines</span>
      <TagPills
        options={CUISINE_TAGS}
        selected={cuisineSel}
        onChange={(next) => update('foodPrefs', [...next, ...dietSel])}
        groupLabel="cuisines"
      />

      <span className="onboarding-step__sublabel">Dietary</span>
      <TagPills
        options={DIET_TAGS}
        selected={dietSel}
        onChange={(next) => update('foodPrefs', [...cuisineSel, ...next])}
        groupLabel="dietary needs"
      />

      <div className="onboarding-step__nav">
        <BackButton onClick={onBack} />
        <NextButton onClick={onNext} />
      </div>
    </div>
  )
}

export default Step2_Food
