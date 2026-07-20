import './CreateItineraryPage.css'
import PageHeading from './PageHeading/PageHeading.jsx'
import WizardStepper from './WizardStepper/WizardStepper.jsx'
import ItineraryWizard from './ItineraryWizard/ItineraryWizard.jsx'
import {useState} from "react";

function CreateItineraryPage() {
  
  const [activeStep, setActiveStep] = useState(1);

  return (
    <div className="create-itinerary-page">
      <PageHeading />
      <WizardStepper activeStep={activeStep}/>
      <ItineraryWizard setActiveStep={setActiveStep}/>
    </div>
  );
}

export default CreateItineraryPage;
