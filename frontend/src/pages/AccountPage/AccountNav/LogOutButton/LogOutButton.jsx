import { useNavigate } from 'react-router-dom'
import './LogOutButton.css'

function LogOutButton({ setCurrentUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setCurrentUser(null); // useEffect in App clears localStorage automatically
    navigate("/");
  };

  return (
    <button className="logout-button" type="button" onClick={handleLogout}>Log Out</button>
  );
}

export default LogOutButton;
