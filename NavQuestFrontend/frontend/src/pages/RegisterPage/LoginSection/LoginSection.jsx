import LoginText from '../LoginText/LoginText.jsx'
import LoginLink from '../LoginLink/LoginLink.jsx'
import './LoginSection.css'

function LoginSection() {
  return (
    <div className="login-section">
      <LoginText />
      <LoginLink />
    </div>
  );
}

export default LoginSection;
