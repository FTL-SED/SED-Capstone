import './OnboardingWizard.css'
import { useState } from 'react'
import WizardStepper from '../../CreateItineraryPage/WizardStepper/WizardStepper.jsx'
import Step1_Interests from '../Step1_Interests/Step1_Interests.jsx'
import Step2_Food from '../Step2_Food/Step2_Food.jsx'
import Step3_LocationPrivacy from '../Step3_LocationPrivacy/Step3_LocationPrivacy.jsx'
import { INITIAL_PREFS } from '../../../lib/preferences.js'

// Onboarding preferences wizard. Reuses the itinerary wizard's pattern: one
// `form` object is the single source of truth, passed down with `update(field,
// value)`; each step self-validates and gates onNext. Three steps collect the
// saved-preference fields (interests, food, and location + privacy). The last
// step calls onFinish(form); the parent OnboardingPage persists + logs in.
const STEP_LABELS = ['Interests', 'Food', 'Finish']

function OnboardingWizard({ onFinish, saving = false, error = '' }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(INITIAL_PREFS)

  const next = () => setStep((s) => Math.min(3, s + 1))
  const back = () => setStep((s) => Math.max(1, s - 1))
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  return (
    // A <fieldset disabled> while saving disables EVERY control inside at once —
    // pills, Back/Next/Finish buttons, the address picker — so once the user hits
    // Finish and account creation is in flight, nothing else is clickable until
    // it resolves (a failure re-enables it via saving=false so they can retry).
    <fieldset className="onboarding-wizard" disabled={saving}>
      <WizardStepper activeStep={step} steps={STEP_LABELS} />

      {step === 1 && <Step1_Interests form={form} update={update} onNext={next} />}
      {step === 2 && <Step2_Food form={form} update={update} onNext={next} onBack={back} />}
      {step === 3 && (
        <Step3_LocationPrivacy
          form={form}
          update={update}
          onBack={back}
          onFinish={() => onFinish(form)}
          saving={saving}
          error={error}
        />
      )}
    </fieldset>
  )
}

export default OnboardingWizard
