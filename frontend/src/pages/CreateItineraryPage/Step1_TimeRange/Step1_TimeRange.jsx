import './Step1_TimeRange.css'
import TimeRangeField from '../TimeRangeField/TimeRangeField.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'

function Step1_TimeRange({ form, update, onNext }) {
  return (
    <div className="step1-time-range">
      <TimeRangeField form={form} update={update} />
      <NextButton onClick={onNext} />
    </div>
  );
}

export default Step1_TimeRange;
