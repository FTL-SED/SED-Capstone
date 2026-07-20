import './Navbar.css';
import Logo from './Logo/Logo.jsx';
import NavLinks from './NavLinks/NavLinks.jsx';
import AuthButtons from './AuthButtons/AuthButtons.jsx'
import AccountIcon from './AccountIcon/AccountIcon.jsx'

function Navbar({isAuthenticated, currentUser}) {
  // Logged-out visitors get Login/Register; logged-in users get the Home /
  // Discover links plus their account icon — on every page, landing included.
  const showAuthButtons = !isAuthenticated;


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
