import './Step2_TravelTransport.css'
import TravelRadiusField from '../TravelRadiusField/TravelRadiusField.jsx'
import TransportField from '../TransportField/TransportField.jsx'
import BudgetField from '../BudgetField/BudgetField.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'

// Trip-level travel + budget settings. Starting locations and preferences are
// now per-member (Step 3). See the integration roadmap (per-member restructure).
function Step2_TravelTransport({ form, update, onNext }) {
  return (
    <div className="step2-travel-transport">
      <TransportField form={form} update={update} />
      <TravelRadiusField form={form} update={update} />
      <BudgetField form={form} update={update} />
      <NextButton onClick={onNext} />
    </div>
  );
}

export default Step2_TravelTransport;
