import AuthCard from '../../components/AuthCard/AuthCard.jsx'
import RegisterForm from './RegisterForm/RegisterForm.jsx'
import LoginSection from './LoginSection/LoginSection.jsx'
import './RegisterPage.css'

function RegisterPage() {
  return (
    <div className="register-page">
      <AuthCard>
        <h1 className="auth-title">Create Account</h1>
        <RegisterForm />
        <LoginSection />
      </AuthCard>
    </div>
  );
}

export default RegisterPage;
