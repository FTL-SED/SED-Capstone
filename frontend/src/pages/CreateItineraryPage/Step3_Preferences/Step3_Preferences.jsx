import './Step3_Preferences.css'
import TagInput from '../../../components/Inputs/TagInput/TagInput.jsx'
import BudgetField from '../BudgetField/BudgetField.jsx'
import NextButton from '../../../components/Inputs/NextButton/NextButton.jsx'

function Step3_Preferences({ form, update, onNext }) {
  return (
    <div className="step3-preferences">
      <div className="step3-preferences__group">
        <h2>Group Interests</h2>
        <TagInput
          placeholder="Enter group interests"
          tags={form.interestTags}
          onChange={(next) => update('interestTags', next)}
        />
      </div>
      <div className="step3-preferences__group">
        <h2>Food Preferences</h2>
        <TagInput
          placeholder="Enter group food preferences"
          tags={form.foodPrefs}
          onChange={(next) => update('foodPrefs', next)}
        />
      </div>
      <BudgetField form={form} update={update} />
      <NextButton onClick={onNext} />
    </div>
  );
}

export default Step3_Preferences;
