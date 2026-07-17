import './Step1_TripBasics.css'
import TimeRangeField from '../TimeRangeField/TimeRangeField.jsx'
import TransportField from '../TransportField/TransportField.jsx'
import TravelRadiusField from '../TravelRadiusField/TravelRadiusField.jsx'
import BudgetField from '../BudgetField/BudgetField.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'

// Step 1 — all trip-level settings on one screen: time window, transport,
// travel radius, and budget. (Who's going + their preferences is Step 2.)
function Step1_TripBasics({ form, update, onNext }) {
  return (
    <div className="step1-trip-basics">
      <TimeRangeField form={form} update={update} />
      <TransportField form={form} update={update} />
      <TravelRadiusField form={form} update={update} />
      <BudgetField form={form} update={update} />
      <NextButton onClick={onNext} />
    </div>
  );
}

export default Step1_TripBasics;
