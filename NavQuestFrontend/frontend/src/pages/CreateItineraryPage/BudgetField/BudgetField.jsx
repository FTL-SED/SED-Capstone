import './BudgetField.css'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'

function BudgetField() {
  return (
    <div className="budget-field">
      <h2>Budget</h2>
      <TextInput placeholder="Enter average budget" type="number" />
    </div>
  );
}

export default BudgetField;
