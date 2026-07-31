import { useNavigate } from 'react-router-dom'
import { signOutSupabase } from '../../../../api/auth.js'
import './LogOutButton.css'

function LogOutButton({ setCurrentUser }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Clear the persisted Supabase session that Google sign-in leaves behind
    // before dropping local state, so no residual session lingers in storage.
    // Await it (a stale session is the root of the "logout then auto-login"
    // bug), but never let a network hiccup block the local logout — the app
    // treats the user as signed out regardless.
    try {
      await signOutSupabase();
    } catch {
      // Ignore — local logout below still signs the user out of the app.
    }
    setCurrentUser(null); // useEffect in App clears localStorage automatically
    navigate("/");
  };

  return (
    <button className="logout-button" type="button" onClick={handleLogout}>Log Out</button>
  );
}

export default LogOutButton;
