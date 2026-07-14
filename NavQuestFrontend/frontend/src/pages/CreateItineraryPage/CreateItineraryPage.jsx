import './CreateItineraryPage.css'
import PageHeading from './PageHeading/PageHeading.jsx'
import WizardStepper from './WizardStepper/WizardStepper.jsx'
import ItineraryWizard from './ItineraryWizard/ItineraryWizard.jsx'

function CreateItineraryPage() {
  return (
    <div>
      <PageHeading />
      <WizardStepper />
      <ItineraryWizard />
    </div>
  );
}

export default CreateItineraryPage;
