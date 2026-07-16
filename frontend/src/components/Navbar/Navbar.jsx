import './Navbar.css';
import { useLocation } from 'react-router-dom';
import Logo from './Logo/Logo.jsx';
import NavLinks from './NavLinks/NavLinks.jsx';
import AuthButtons from './AuthButtons/AuthButtons.jsx'
import AccountIcon from './AccountIcon/AccountIcon.jsx'

function Navbar({isAuthenticated, currentUser}) {
  const { pathname } = useLocation();
  const showAuthButtons = !isAuthenticated || pathname === '/';


  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Logo />
            {showAuthButtons ? (
                <AuthButtons isAuthenticated={isAuthenticated} />
              ) : (
                <>
                  <NavLinks />
                  <AccountIcon currentUser={currentUser} />
                </>
              )}
      </div>
    </header>
  );
}

export default Navbar;
