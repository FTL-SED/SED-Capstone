import { Link } from 'react-router-dom'
import './Logo.css'

function Logo() {
  return (
    <Link to="/" className="logo">
      <h3>NavQuest</h3>
    </Link>
  );
}

export default Logo;
