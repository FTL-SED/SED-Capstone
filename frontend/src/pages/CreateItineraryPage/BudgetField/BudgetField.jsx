import './BudgetField.css'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'

function BudgetField({ form, update }) {
  return (
    <div className="budget-field">
      <h2>Budget</h2>
      <TextInput
        placeholder="Enter average budget per person"
        type="number"
        value={form.budget}
        onChange={(e) => update('budget', e.target.value)}
      />
    </div>
  );
}

export default BudgetField;
