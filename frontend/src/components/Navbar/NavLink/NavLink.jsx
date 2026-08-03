import './NavLink.css'
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom'
import useSkyTransition from '../../../hooks/useSkyTransition.js'

// An in-app nav link. Renders as a RouterNavLink (for the active styling) but
// intercepts the click to navigate through a subtle cross-fade view transition
// (see the "fade" kind in App.css), so switching between Dashboard / Explore /
// Create eases rather than hard-cutting. Modified clicks (new tab, etc.) and
// clicking the current page fall through to default behavior.
function NavLink({ label, to }) {
  const transition = useSkyTransition();
  const { pathname } = useLocation();

  const handleClick = (e) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
      pathname === to
    ) {
      return;
    }
    e.preventDefault();
    transition(to, 'fade');
  };

  return (
    <RouterNavLink
      to={to}
      onClick={handleClick}
      className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
    >
      {label}
    </RouterNavLink>
  );
}

export default NavLink;
