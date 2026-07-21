import AuthCard from '../../components/AuthCard/AuthCard.jsx';
import LoginForm from './LoginForm/LoginForm.jsx';
import SignUpSection from './SignUpSection/SignUpSection.jsx';
import './LoginPage.css'

function LoginPage({setCurrentUser}) {
  return (
    <div className="login-page">
      <AuthCard>
        <header className="auth-card__head">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Log in to pick up planning your next great day.</p>
        </header>
        <LoginForm setCurrentUser={setCurrentUser}/>
        <SignUpSection />
      </AuthCard>
    </div>
  );
}

export default LoginPage;
