import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx';
import PasswordInput from '../../../components/Inputs/PasswordInput/PasswordInput.jsx';
import SubmitButton from '../../../components/Inputs/SubmitButton/SubmitButton.jsx';
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import './LoginForm.css'

const BASE_URL = import.meta.env.VITE_BASE_URL;

function LoginForm({setCurrentUser}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      <SubmitButton 
        label="Log In" 
        onClick={handleSubmit}
        loading={loading}
      />

    </form>
  );
}

export default LoginForm;
