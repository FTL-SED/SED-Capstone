import './WizardStepper.css'
import Step from '../Step/Step.jsx'

function WizardStepper() {
  return (
    <div className="wizard-stepper">
      <Step number={1} label="Trip Basics" active />
      <Step number={2} label="Members" />
      <Step number={3} label="Finish" />
    </div>
  );
}

export default WizardStepper;
