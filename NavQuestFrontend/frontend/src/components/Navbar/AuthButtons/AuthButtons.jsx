import './AuthButtons.css'
import LoginButton from '../LoginButton/LoginButton.jsx';
import RegisterButton from '../RegisterButton/RegisterButton.jsx';


function AuthButtons() {
  return (
    <div className="auth-buttons">
      <LoginButton/>
      <RegisterButton/>
    </div>
  );
}

export default AuthButtons;
