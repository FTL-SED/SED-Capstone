import AuthCard from '../../components/AuthCard/AuthCard.jsx';
import LoginForm from './LoginForm/LoginForm.jsx';
import SignUpSection from './SignUpSection/SignUpSection.jsx';
import './LoginPage.css'

function LoginPage() {
  return (
    <AuthCard>
      <h1>Log into NavQuest</h1>
      <LoginForm />
      <SignUpSection />
    </AuthCard>
  );
}

export default LoginPage;
