import { Link } from 'react-router-dom';
import './RegisterLink.css'
import useSkyTransition from '../../../hooks/useSkyTransition'

function RegisterLink() {
  const skyNavigate = useSkyTransition();

  // Switching between the auth pages keeps the sky still and morphs only the
  // card. (See App.css.) Let modifier/middle clicks open normally.
  const handleClick = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    skyNavigate("/register", "card");
  };

  return (
    <Link className="register-link" to="/register" onClick={handleClick}>Sign Up.</Link>
  );
}

export default RegisterLink;
