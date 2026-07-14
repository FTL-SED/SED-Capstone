import { Link } from 'react-router-dom'
import './StartPlanningButton.css'

function StartPlanningButton() {
  return (
    <Link to="/register" className="start-planning-button"><button className="start-planning-button__btn">Start Planning</button></Link>
  );
}

export default StartPlanningButton;
