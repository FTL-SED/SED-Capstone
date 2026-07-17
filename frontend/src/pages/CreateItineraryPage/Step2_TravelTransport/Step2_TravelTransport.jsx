import './Step2_TravelTransport.css'
import AddressPicker from '../../../components/Inputs/AddressPicker/AddressPicker.jsx'
import TravelRadiusField from '../TravelRadiusField/TravelRadiusField.jsx'
import TransportField from '../TransportField/TransportField.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'

function Step2_TravelTransport({ form, update, onNext }) {
  return (
    <div className="step2-travel-transport">
      <div className="step2-travel-transport__group">
        <h2>Starting Locations</h2>
        <AddressPicker
          placeholder="Enter a starting location"
          value={form.startingLocations}
          onChange={(next) => update('startingLocations', next)}
        />
      </div>
      <TravelRadiusField form={form} update={update} />
      <TransportField form={form} update={update} />
      <NextButton onClick={onNext} />
    </div>
  );
}

export default Step2_TravelTransport;
