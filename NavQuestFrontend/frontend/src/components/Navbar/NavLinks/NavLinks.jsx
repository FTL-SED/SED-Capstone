import './NavLinks.css'
import NavLink from '../NavLink/NavLink.jsx'

function NavLinks() {
  return (
    <div>
      <NavLink label="Home" to="/home" />
      <NavLink label="Discover" to="/discover" />
    </div>
  );
}

export default NavLinks;
