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
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    const userData = { email, password };

    e.preventDefault();
    try {
      const response = await axios.post(`${BASE_URL}/users/login`, userData);
      setError("");
      setCurrentUser(response.data.user);
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
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
      />

    </form>
  );
}

export default LoginForm;
