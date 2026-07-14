import './Step1_TimeRange.css'
import TimeRangeField from '../TimeRangeField/TimeRangeField.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'

function Step1_TimeRange({ onNext }) {
  return (
    <div>
      <TimeRangeField />
      <NextButton onClick={onNext} />
    </div>
  );
}

export default Step1_TimeRange;
