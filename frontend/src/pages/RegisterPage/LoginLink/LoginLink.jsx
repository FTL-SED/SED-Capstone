import { Link } from 'react-router-dom'
import './LoginLink.css'

function LoginLink() {
  return (
    <Link className="login-link" to="/login">Log in.</Link>
  );
}

export default LoginLink;
