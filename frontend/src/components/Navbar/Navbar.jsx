import './Navbar.css';
import Logo from './Logo/Logo.jsx';
import NavLinks from './NavLinks/NavLinks.jsx';
import AuthButtons from './AuthButtons/AuthButtons.jsx'
import AccountIcon from './AccountIcon/AccountIcon.jsx'

function Navbar({isAuthenticated, currentUser, variant}) {
  // Logged-out visitors get Login/Register; logged-in users get the primary
  // links plus their account icon — on every page, landing included. The "hero"
  // variant is the warm, floating bar used over the landing + auth scenes.
  const showAuthButtons = !isAuthenticated;
  const className = variant === 'hero' ? 'navbar navbar--hero' : 'navbar';

  return (
    <header className={className}>
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
