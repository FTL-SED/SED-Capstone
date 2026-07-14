import './Step4_Finish.css'
import ItineraryDetailsPreview from '../ItineraryDetailsPreview/ItineraryDetailsPreview.jsx'
import PrivacyField from '../PrivacyField/PrivacyField.jsx'
import FinishButton from '../FinishButton/FinishButton.jsx'

function Step4_Finish() {
  return (
    <div>
      <PrivacyField />
      <ItineraryDetailsPreview />
      <FinishButton />
    </div>
  );
}

export default Step4_Finish;
