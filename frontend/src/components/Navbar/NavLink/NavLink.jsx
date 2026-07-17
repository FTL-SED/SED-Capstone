import './NavLink.css'
import { NavLink as RouterNavLink } from 'react-router-dom'

function NavLink({label, to}) {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
    >
      {label}
    </RouterNavLink>
  );
}

export default NavLink;
