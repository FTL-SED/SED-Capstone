import './ItineraryWizard.css'
import { useState } from 'react'
import Step1_TimeRange from '../Step1_TimeRange/Step1_TimeRange.jsx'
import Step2_TravelTransport from '../Step2_TravelTransport/Step2_TravelTransport.jsx'
import Step3_Preferences from '../Step3_Preferences/Step3_Preferences.jsx'
import Step4_Finish from '../Step4_Finish/Step4_Finish.jsx'

function ItineraryWizard() {
  const [step, setStep] = useState(1);
  const next = () => setStep((s) => s + 1);

  return (
    <div className="itinerary-wizard">
      {step === 1 && <Step1_TimeRange onNext={next} />}
      {step === 2 && <Step2_TravelTransport onNext={next} />}
      {step === 3 && <Step3_Preferences onNext={next} />}
      {step === 4 && <Step4_Finish />}
    </div>
  );
}

export default ItineraryWizard;
