import { useNavigate } from 'react-router-dom'
import { signOutSupabase } from '../../../../api/auth.js'
import './LogOutButton.css'

function LogOutButton({ setCurrentUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Also clear any persisted Supabase session (Google sign-in leaves one),
    // so a residual session can't later satisfy a password reset. Fire-and-
    // forget — don't block the local logout/navigation on the network call.
    signOutSupabase();
    setCurrentUser(null); // useEffect in App clears localStorage automatically
    navigate("/");
  };

  return (
    <button className="logout-button" type="button" onClick={handleLogout}>Log Out</button>
  );
}

export default LogOutButton;
