import './Step2_TravelTransport.css'
import TagInput from '../../../components/Inputs/TagInput/TagInput.jsx'
import TravelRadiusField from '../TravelRadiusField/TravelRadiusField.jsx'
import TransportField from '../TransportField/TransportField.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'

function Step2_TravelTransport({ onNext }) {
  return (
    <div className="step2-travel-transport">
      <div className="step2-travel-transport__group">
        <h2>Starting Locations</h2>
        <TagInput placeholder="Enter starting locations" tags={[]} />
      </div>
      <TravelRadiusField />
      <TransportField />
      <NextButton onClick={onNext} />
    </div>
  );
}

export default Step2_TravelTransport;
