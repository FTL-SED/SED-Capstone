import './ItineraryWizard.css'
import { useState } from 'react'
import Step1_TimeRange from '../Step1_TimeRange/Step1_TimeRange.jsx'
import Step2_TravelTransport from '../Step2_TravelTransport/Step2_TravelTransport.jsx'
import Step3_Preferences from '../Step3_Preferences/Step3_Preferences.jsx'
import Step4_Finish from '../Step4_Finish/Step4_Finish.jsx'

// The single source of truth for everything the wizard collects. Each step
// reads/writes it via the `form` + `update` props; the finish handler (Step 7)
// submits it. See .claude/roadmap/frontend-backend-integration.md (Step 5).
const INITIAL_FORM = {
  startTime: '',
  endTime: '',
  transport: '',
  travelRadius: '',
  startingLocations: [], // [{ label, latitude, longitude }]
  interestTags: [],
  foodPrefs: [],
  budget: '',
  isPublic: false,
};

function ItineraryWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const next = () => setStep((s) => s + 1);
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="itinerary-wizard">
      {step === 1 && <Step1_TimeRange form={form} update={update} onNext={next} />}
      {step === 2 && <Step2_TravelTransport form={form} update={update} onNext={next} />}
      {step === 3 && <Step3_Preferences form={form} update={update} onNext={next} />}
      {step === 4 && <Step4_Finish form={form} update={update} />}
    </div>
  );
}

export default ItineraryWizard;
