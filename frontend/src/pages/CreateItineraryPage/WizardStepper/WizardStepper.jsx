import './WizardStepper.css'
import Step from '../Step/Step.jsx'

// Progress stepper. Defaults to the itinerary wizard's three labels, but accepts
// a `steps` list of labels so other wizards (e.g. onboarding) can reuse it with
// their own step names. `activeStep` is 1-indexed.
const ITINERARY_STEPS = ['Trip Basics', 'Members', 'Finish'];

function WizardStepper({ activeStep, steps = ITINERARY_STEPS }) {
  return (
    <div className="wizard-stepper">
      {steps.map((label, i) => (
        <Step key={label} number={i + 1} label={label} active={activeStep === i + 1} />
      ))}
    </div>
  );
}

export default WizardStepper;
