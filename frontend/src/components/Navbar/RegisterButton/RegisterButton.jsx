import './RegisterButton.css'
import { Link } from 'react-router-dom'
import useSkyTransition from '../../../hooks/useSkyTransition'

function RegisterButton() {
  const skyNavigate = useSkyTransition();

  // Leaving the landing page "ascends into the clouds"; moving between the auth
  // pages keeps the sky still and only morphs the card. (See App.css.) Let
  // modifier/middle clicks fall through so "open in new tab" still works.
  const handleClick = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    skyNavigate("/register", window.location.pathname === "/" ? "ascend" : "card");
  };

  return (
    <Link to="/register" onClick={handleClick}>
      <button className="register-button">Register</button>
    </Link>
  );
}

export default RegisterButton;
