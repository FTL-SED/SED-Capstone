import AuthCard from '../../components/AuthCard/AuthCard.jsx'
import RegisterForm from './RegisterForm/RegisterForm.jsx'
import LoginSection from './LoginSection/LoginSection.jsx'
import './RegisterPage.css'

function RegisterPage({setCurrentUser}) {
  return (
    <div className="register-page">
      <AuthCard>
        <header className="auth-card__head">
          <h1 className="auth-title">Join NavQuest</h1>
          <p className="auth-subtitle">Create an account to start planning trips together.</p>
        </header>
        <RegisterForm setCurrentUser={setCurrentUser}/>
        <LoginSection />
      </AuthCard>
    </div>
  );
}

export default RegisterPage;
