import './NavLinks.css'
import NavLink from '../NavLink/NavLink.jsx'

function NavLinks() {
  return (
    <nav className="nav-links">
      <NavLink label="Home" to="/home" />
      <NavLink label="Discover" to="/discover" />
    </nav>
  );
}

export default NavLinks;
