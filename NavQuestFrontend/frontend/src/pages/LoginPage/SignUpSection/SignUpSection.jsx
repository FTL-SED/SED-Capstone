import SignUpText from '../SignUpText/SignUpText.jsx';
import RegisterLink from '../RegisterLink/RegisterLink.jsx';
import './SignUpSection.css'

function SignUpSection() {
  return (
    <div className="signup-section">
      <SignUpText />
      <RegisterLink />
    </div>
  );
}

export default SignUpSection;
