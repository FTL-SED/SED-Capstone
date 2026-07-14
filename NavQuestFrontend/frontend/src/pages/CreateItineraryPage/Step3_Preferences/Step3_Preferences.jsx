import './Step3_Preferences.css'
import TagInput from '../../../components/Inputs/TagInput/TagInput.jsx'
import BudgetField from '../BudgetField/BudgetField.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'

function Step3_Preferences({ onNext }) {
  return (
    <div>
      <h2>Group Interests</h2>
      <TagInput placeholder="Enter group interests" tags={[]} />
      <h2>Food Preferences</h2>
      <TagInput placeholder="Enter group food preferences" tags={[]} />
      <BudgetField />
      <NextButton onClick={onNext} />
    </div>
  );
}

export default Step3_Preferences;
