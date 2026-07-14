import './NavLink.css'
import { Link } from 'react-router-dom'

function NavLink({label, to}) {
  return (
    <Link to={to}>{label}</Link>
  );
}

export default NavLink;
