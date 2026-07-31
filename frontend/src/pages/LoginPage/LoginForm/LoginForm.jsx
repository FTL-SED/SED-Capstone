import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx';
import PasswordInput from '../../../components/Inputs/PasswordInput/PasswordInput.jsx';
import SubmitButton from '../../../components/Inputs/SubmitButton/SubmitButton.jsx';
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'
import ConfirmationMessage from '../../../components/ConfirmationMessage/ConfirmationMessage.jsx'
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { signInWithGoogle, completeOAuthSignIn } from '../../../api/auth.js'
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

  // Start the Google OAuth flow. The browser leaves for Google's consent screen
  // and returns to /login, where the effect below finishes the sign-in.
  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch {
      setError("Couldn't start Google sign-in. Please try again.");
    }
  };

  useEffect(() => {
    if (location.state?.message) {
      // Wipe the state so a refresh/back-nav doesn't show the message again.
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // On return from Google, exchange the Supabase session for our app profile.
  // Runs on every mount but no-ops when there's no pending OAuth session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await completeOAuthSignIn();
        if (!result || cancelled) return;
        localStorage.setItem("accessToken", result.accessToken);
        localStorage.setItem("sessionExpiresAt", String(result.expiresAt));
        setCurrentUser(result.user);
        navigate("/home");
      } catch {
        if (!cancelled) setError("Google sign-in failed. Please try again.");
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, setCurrentUser]);

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

      <div className="login-form__divider"><span>or</span></div>

      <button
        type="button"
        className="google-button"
        onClick={handleGoogle}
      >
        <img
          className="google-button__icon"
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt=""
          aria-hidden="true"
        />
        Continue with Google
      </button>

    </form>
  );
}

export default LoginForm;
