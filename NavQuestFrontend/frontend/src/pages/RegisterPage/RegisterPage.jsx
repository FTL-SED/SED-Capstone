import AuthCard from '../../components/AuthCard/AuthCard.jsx'
import RegisterForm from './RegisterForm/RegisterForm.jsx'
import LoginSection from './LoginSection/LoginSection.jsx'
import './RegisterPage.css'

function RegisterPage() {
  return (
    <AuthCard>
      <h1>Create Account</h1>
      <RegisterForm />
      <LoginSection />
    </AuthCard>
  );
}

export default RegisterPage;
