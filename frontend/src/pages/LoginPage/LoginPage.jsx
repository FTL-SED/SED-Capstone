import AuthCard from '../../components/AuthCard/AuthCard.jsx';
import LoginForm from './LoginForm/LoginForm.jsx';
import SignUpSection from './SignUpSection/SignUpSection.jsx';
import './LoginPage.css'

function LoginPage() {
  return (
    <div className="login-page">
      <AuthCard>
        <h1 className="auth-title">Log into NavQuest</h1>
        <LoginForm />
        <SignUpSection />
      </AuthCard>
    </div>
  );
}

export default LoginPage;
