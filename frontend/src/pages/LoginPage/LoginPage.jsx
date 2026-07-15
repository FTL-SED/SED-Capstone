import AuthCard from '../../components/AuthCard/AuthCard.jsx';
import LoginForm from './LoginForm/LoginForm.jsx';
import SignUpSection from './SignUpSection/SignUpSection.jsx';
import './LoginPage.css'

function LoginPage({setCurrentUser}) {
  return (
    <div className="login-page">
      <AuthCard>
        <h1 className="auth-title">Log into NavQuest</h1>
        <LoginForm setCurrentUser={setCurrentUser}/>
        <SignUpSection />
      </AuthCard>
    </div>
  );
}

export default LoginPage;
