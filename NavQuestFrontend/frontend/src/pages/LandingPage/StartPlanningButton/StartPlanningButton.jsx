import { Link } from 'react-router-dom'
import './StartPlanningButton.css'

function StartPlanningButton() {
  return (
    <Link to="/register"><button>Start Planning</button></Link>
  );
}

export default StartPlanningButton;
