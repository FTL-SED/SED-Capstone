import './FinishButton.css'
import { Link } from 'react-router-dom'

function FinishButton({ onClick }) {
  return (
    <button className="finish-button" type="button" onClick={onClick}>finish</button>
  );
}

export default FinishButton;
