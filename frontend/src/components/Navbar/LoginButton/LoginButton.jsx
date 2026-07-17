import './LoginButton.css'
import { Link } from 'react-router-dom'

function LoginButton({isAuthenticated}) {

  return (
    <Link to={isAuthenticated ? "/home" : "/login"}>
      <button className="login-button">Login</button>
    </Link>
  );
}

export default LoginButton;
