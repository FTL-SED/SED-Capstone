import './AuthButtons.css'
import LoginButton from '../LoginButton/LoginButton.jsx';
import RegisterButton from '../RegisterButton/RegisterButton.jsx';


function AuthButtons() {
  return (
    <div>
      <LoginButton/>
      <RegisterButton/>
    </div>
  );
}

export default AuthButtons;
