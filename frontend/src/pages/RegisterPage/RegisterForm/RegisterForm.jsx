import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'
import PasswordInput from '../../../components/Inputs/PasswordInput/PasswordInput.jsx'
import SubmitButton from '../../../components/Inputs/SubmitButton/SubmitButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkAvailability } from "../../../api/users.js";
import './RegisterForm.css'

function RegisterForm() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate BEFORE proceeding — the account isn't created until the user
    // finishes onboarding, so if we don't catch problems here, they'd sail
    // through the whole wizard only to fail at the very end. These checks mirror
    // what the backend enforces so "Continue" can't advance credentials that
    // will just be rejected at account-creation time.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!username.trim()) {
      setError("Please enter a username.");
      return;
    }
    // Supabase's password policy: 8+ chars incl. lowercase, uppercase, a digit,
    // and a symbol (matches the hint below + the backend's weak_password error).
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordPattern.test(password)) {
      setError("Password must be 8+ characters and include a lowercase letter, an uppercase letter, a number, and a symbol.");
      return;
    }

    // Uniqueness can only be answered by the server, so check email/username
    // availability before entering onboarding. (The DB constraint in
    // registerUser is still the real guarantee — this is the up-front UX check.)
    setLoading(true);
    setError("");
    try {
      const { emailTaken, usernameTaken } = await checkAvailability({
        email,
        username: username.trim(),
      });
      if (emailTaken && usernameTaken) {
        setError("That email and username are both already taken.");
        return;
      }
      if (emailTaken) {
        setError("That email is already registered. Try logging in.");
        return;
      }
      if (usernameTaken) {
        setError("That username is already taken.");
        return;
      }
    } catch {
      setError("Couldn’t verify your details right now. Please try again.");
      return;
    } finally {
      setLoading(false);
    }

    // Do NOT create the account here — an abandoned onboarding wizard should
    // leave no account behind. Carry the entered credentials into onboarding in
    // memory; the account is created only when the user hits Finish, which then
    // logs them in (see OnboardingPage.handleFinish).
    navigate("/onboarding", {
      state: { credentials: { email, username: username.trim(), password } },
    });
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

      <SubmitButton
        label="Continue"
        onClick={handleSubmit}
        loading={loading}
      />

    </form>
  );
}

export default RegisterForm;
