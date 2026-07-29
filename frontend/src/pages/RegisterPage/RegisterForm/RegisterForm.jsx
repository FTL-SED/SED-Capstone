import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'
import PasswordInput from '../../../components/Inputs/PasswordInput/PasswordInput.jsx'
import SubmitButton from '../../../components/Inputs/SubmitButton/SubmitButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'
import ConfirmationMessage from '../../../components/ConfirmationMessage/ConfirmationMessage.jsx'
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import './RegisterForm.css'

const BASE_URL = import.meta.env.VITE_BASE_URL;

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("") // confirmation message
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
   
  const handleSubmit = async (e) => {
    const userData = { email, username, password };

    e.preventDefault();

    // Basic email-format check before hitting the server.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setSuccess("");
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/users/register`, userData);
      setError("");
      setTimeout(() => { navigate("/login", { state: { message: "Account created! You can now log in." }, }); },1200);
    } catch (err) {
      setSuccess("")
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form className="register-form">
      <TextInput 
        placeholder="Email" 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
      />

      <TextInput
        placeholder="Username" 
        value={username} 
        onChange={(e) => setUsername(e.target.value)}
      />

      <PasswordInput
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <p className="register-form__password-hint">
        Password — 8+ characters, A-Z, a-z, 0-9, symbol
      </p>
      <ErrorMessage message={error}/>
      <ConfirmationMessage message={success}/>
      
      <SubmitButton
        label="Sign Up"
        onClick={handleSubmit}
        loading={loading}
      />

    </form>
  );
}

export default RegisterForm;
