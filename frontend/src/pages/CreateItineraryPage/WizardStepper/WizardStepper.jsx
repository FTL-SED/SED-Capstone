import './WizardStepper.css'
import Step from '../Step/Step.jsx'

function WizardStepper({activeStep}) {
  
  return (
    <div className="wizard-stepper">
      <Step number={1} label="Trip Basics" active={activeStep === 1} />
      <Step number={2} label="Members" active={activeStep === 2}/>
      <Step number={3} label="Finish" active={activeStep === 3}/>
    </div>
  );
}

export default WizardStepper;
