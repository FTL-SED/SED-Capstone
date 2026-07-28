import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx';
import PasswordInput from '../../../components/Inputs/PasswordInput/PasswordInput.jsx';
import SubmitButton from '../../../components/Inputs/SubmitButton/SubmitButton.jsx';
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'
import ConfirmationMessage from '../../../components/ConfirmationMessage/ConfirmationMessage.jsx'
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import './LoginForm.css'

const BASE_URL = import.meta.env.VITE_BASE_URL;

function LoginForm({setCurrentUser}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [success] = useState(location.state?.message || "");

  const handleSubmit = async (e) => {
    const userData = { email, password };

    e.preventDefault();

    // Basic email-format check before hitting the server.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true); 
    try {
      const response = await axios.post(`${BASE_URL}/users/login`, userData);
      const { user, session } = response.data;

      // Guard against a 200 that's missing the user or session — without these
      // we can't authenticate, so surface an error instead of navigating to a
      // protected route that would just bounce back to the landing page.
      if (!user || !session?.access_token) {
        setError("Something went wrong. Please try again.");
        return;
      }

      setError("");
      localStorage.setItem("accessToken", session.access_token);
      localStorage.setItem("sessionExpiresAt", String(session.expires_at * 1000));
      setCurrentUser(user);
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.message) {
      // Wipe the state so a refresh/back-nav doesn't show the message again.
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  return (
    <form className="login-form">
      <TextInput 
        placeholder="Email" 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <PasswordInput 
        placeholder="Password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)}
      />

      <ErrorMessage message={error}/>
      <ConfirmationMessage message={success} />
      <SubmitButton 
        label="Log In" 
        onClick={handleSubmit}
        loading={loading}
      />

    </form>
  );
}

export default LoginForm;
