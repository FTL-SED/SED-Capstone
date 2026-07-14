import './RegisterButton.css'
import { Link } from 'react-router-dom'

function RegisterButton() {
  return (
    <Link to="/register">
      <button className="register-button">Register</button>
    </Link>
  );
}

export default RegisterButton;
