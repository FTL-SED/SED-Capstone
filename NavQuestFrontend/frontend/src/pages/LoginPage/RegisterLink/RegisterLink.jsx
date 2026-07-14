import { Link } from 'react-router-dom';
import './RegisterLink.css'

function RegisterLink() {
  return (
    <Link className="register-link" to="/register">Sign Up.</Link>
  );
}

export default RegisterLink;
