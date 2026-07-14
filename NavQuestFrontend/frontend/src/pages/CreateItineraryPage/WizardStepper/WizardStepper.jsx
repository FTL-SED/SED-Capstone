import './WizardStepper.css'
import Step from '../Step/Step.jsx'

function WizardStepper() {
  return (
    <div>
      <Step number={1} label="Time Range" />
      <Step number={2} label="Travel/Transport" />
      <Step number={3} label="Preferences" />
      <Step number={4} label="Finish" />
    </div>
  );
}

export default WizardStepper;
