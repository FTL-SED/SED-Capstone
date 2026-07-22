import './ItineraryWizard.css'
import { useState } from 'react'
import PageHeading from '../PageHeading/PageHeading.jsx'
import WizardStepper from '../WizardStepper/WizardStepper.jsx'
import Step1_TripBasics from '../Step1_TripBasics/Step1_TripBasics.jsx'
import Step2_Members from '../Step2_Members/Step2_Members.jsx'
import Step3_Finish from '../Step3_Finish/Step3_Finish.jsx'
import { newMember } from '../memberModel.js'
import { useLocation } from 'react-router-dom'


// The single source of truth for everything the wizard collects. Trip-level
// fields live at the top; per-member fields live in `members` (name, one
// starting location, and that member's interests/food). Each step reads/writes
// via the `form` + `update` props; the finish handler submits it.
// See .claude/roadmap/frontend-backend-integration.md (Step 5).
const INITIAL_FORM = {
  tripDate: '',
  startTime: '',
  endTime: '',
  transport: '',
  travelRadius: '',
  budget: '',
  members: [newMember()],
  isPublic: false,
  title: '',
  description: '',
};

function ItineraryWizard() {
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(location.state?.form ?? INITIAL_FORM);

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const goTo = (n) => setStep(n);
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="itinerary-wizard">
      {/* Heading + progress stepper now live inside the card, above the form */}
      <PageHeading />
      <WizardStepper activeStep={step} />

      {step === 1 && <Step1_TripBasics form={form} update={update} onNext={next} />}
      {step === 2 && <Step2_Members form={form} update={update} onNext={next} onBack={back} />}
      {step === 3 && <Step3_Finish form={form} update={update} onBack={back} goTo={goTo} />}
    </div>
  );
}

export default ItineraryWizard;
