import './Step3_LocationPrivacy.css'
import AddressPicker from '../../../components/Inputs/AddressPicker/AddressPicker.jsx'
import PrivacyButton from '../../../pages/ItineraryPage/PrivacyButton/PrivacyButton.jsx'
import SubmitButton from '../../../components/Inputs/SubmitButton/SubmitButton.jsx'
import BackButton from '../../../components/Inputs/BackButton/BackButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'

// Onboarding step 3: a default starting location (optional) + the public/private
// preference, then finish. Location is optional here — it only pre-fills a group
// member later — so this step never blocks finishing. `saving`/`error` come from
// the parent, which owns the save + auto-login.
function Step3_LocationPrivacy({ form, update, onBack, onFinish, saving = false, error = '' }) {
  return (
    <div className="onboarding-step">
      <h2 className="onboarding-step__title">Where are you starting from?</h2>
      <p className="onboarding-step__hint">
        A default starting point we can pre-fill when you plan a trip.
      </p>

      <AddressPicker
        placeholder="Enter your usual starting location"
        value={form.location}
        onChange={(loc) => update('location', loc)}
      />

      <div className="onboarding-step__privacy">
        <div className="onboarding-step__privacy-copy">
          <span className="onboarding-step__sublabel">Profile visibility</span>
          <p className="onboarding-step__hint">
            Public profiles can be found by username and added to a group trip.
            Private profiles never appear in search.
          </p>
        </div>
        <PrivacyButton
          isPublic={form.isPublic}
          onClick={() => update('isPublic', !form.isPublic)}
        />
      </div>

      <ErrorMessage message={error} />

      <div className="onboarding-step__nav">
        <BackButton onClick={onBack} />
        <SubmitButton label="Finish" onClick={onFinish} loading={saving} />
      </div>
    </div>
  )
}

export default Step3_LocationPrivacy
