import { Link } from 'react-router-dom'
import './StartPlanningButton.css'
import useSkyTransition from '../../../hooks/useSkyTransition'

function StartPlanningButton() {
  const skyNavigate = useSkyTransition();

  // The hero CTA "ascends into the clouds" on its way to the auth pages.
  // (See App.css.) Let modifier/middle clicks open normally.
  const handleClick = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    skyNavigate("/login", "ascend");
  };

  return (
    <Link to="/login" className="start-planning-button" onClick={handleClick}><button className="start-planning-button__btn">Start Planning</button></Link>
  );
}

export default StartPlanningButton;
