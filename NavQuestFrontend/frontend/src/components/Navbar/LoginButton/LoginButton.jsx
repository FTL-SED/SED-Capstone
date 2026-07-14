import './LoginButton.css'
import { Link } from 'react-router-dom'

function LoginButton() {
  return (
    <Link to="/login">
      <button className="login-button">Login</button>
    </Link>
  );
}

export default LoginButton;
