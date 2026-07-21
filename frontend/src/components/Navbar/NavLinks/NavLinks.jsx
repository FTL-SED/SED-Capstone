import './NavLinks.css'
import NavLink from '../NavLink/NavLink.jsx'

function NavLinks() {
  return (
    <nav className="nav-links">
      <NavLink label="Dashboard" to="/home" />
      <NavLink label="Explore" to="/discover" />
      <NavLink label="Create" to="/create" />
    </nav>
  );
}

export default NavLinks;
