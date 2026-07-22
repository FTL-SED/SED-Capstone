import { Link } from 'react-router-dom'
import './LoginLink.css'
import useSkyTransition from '../../../hooks/useSkyTransition'

function LoginLink() {
  const skyNavigate = useSkyTransition();

  // Switching between the auth pages keeps the sky still and morphs only the
  // card. (See App.css.) Let modifier/middle clicks open normally.
  const handleClick = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    skyNavigate("/login", "card");
  };

  return (
    <Link className="login-link" to="/login" onClick={handleClick}>Log in.</Link>
  );
}

export default LoginLink;
