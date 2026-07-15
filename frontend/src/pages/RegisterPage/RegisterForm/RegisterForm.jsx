import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'
import PasswordInput from '../../../components/Inputs/PasswordInput/PasswordInput.jsx'
import SubmitButton from '../../../components/Inputs/SubmitButton/SubmitButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'
import ConfirmationMessage from '../../../components/ConfirmationMessage/ConfirmationMessage.jsx'
import { useState } from "react";
import axios from "axios";
import './RegisterForm.css'

const BASE_URL = import.meta.env.VITE_BASE_URL;

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("") // confirmation message
   
  const handleSubmit = async (e) => {
    const userData = { email, username, password };

    e.preventDefault();
    try {
      const response = await axios.post(`${BASE_URL}/users/register`, userData);
      setError("");
      setSuccess("Account created! You can now log in.");
      setCurrentUser(response.data.user);
    } catch (err) {
      setSuccess("")
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
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
      <ErrorMessage message={error}/>
      <ConfirmationMessage message={success}/>
      
      <SubmitButton 
        label="Sign Up" 
        onClick={handleSubmit}
      />

    </form>
  );
}

export default RegisterForm;
