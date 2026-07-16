import './AuthButtons.css'
import LoginButton from '../LoginButton/LoginButton.jsx';
import RegisterButton from '../RegisterButton/RegisterButton.jsx';


function AuthButtons({isAuthenticated}) {

  return (
    <div className="auth-buttons">
      <LoginButton isAuthenticated={isAuthenticated}/>
      <RegisterButton/>
    </div>
  );
}

export default AuthButtons;
