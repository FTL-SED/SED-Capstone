import './Navbar.css';
import { useLocation } from 'react-router-dom';
import Logo from './Logo/Logo.jsx';
import NavLinks from './NavLinks/NavLinks.jsx';
import AuthButtons from './AuthButtons/AuthButtons.jsx'
import AccountIcon from './AccountIcon/AccountIcon.jsx'

function Navbar() {
  const { pathname } = useLocation();

  // Landing/login/register are the signed-out entry points; everything else is
  // the signed-in app. Until real auth exists, the route stands in for it.
  let isAuthenticated = true;
  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    isAuthenticated = false;
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Logo />
        {isAuthenticated ? (
          <>
            <NavLinks />
            <AccountIcon />
          </>
        ) : (
          <AuthButtons />
        )}
      </div>
    </header>
  );
}

export default Navbar;
