import './LoginButton.css'
import { Link } from 'react-router-dom'
import useSkyTransition from '../../../hooks/useSkyTransition'

function LoginButton({isAuthenticated}) {
  const skyNavigate = useSkyTransition();
  const to = isAuthenticated ? "/home" : "/login";

  // Leaving the landing page "ascends into the clouds"; moving between the auth
  // pages keeps the sky still and only morphs the card. (See App.css.) Let
  // modifier/middle clicks fall through so "open in new tab" still works.
  const handleClick = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    skyNavigate(to, window.location.pathname === "/" ? "ascend" : "card");
  };

  return (
    <Link to={to} onClick={handleClick}>
      <button className="login-button">Login</button>
    </Link>
  );
}

export default LoginButton;
