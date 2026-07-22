import './Navbar.css';
import Logo from './Logo/Logo.jsx';
import NavLinks from './NavLinks/NavLinks.jsx';
import AuthButtons from './AuthButtons/AuthButtons.jsx'
import AccountIcon from './AccountIcon/AccountIcon.jsx'

function Navbar({isAuthenticated, currentUser, variant, floating, landing}) {
  // Logged-out visitors get Login/Register; logged-in users get the primary
  // links plus their account icon — on every page, landing included. The "hero"
  // variant is the warm editorial treatment (used app-wide); `floating` layers
  // on the transparent, over-the-scene behaviour for the landing + auth pages.
  // `landing` further overrides that to the solid cream fill so the landing bar
  // matches the in-app dashboard / create / discover pages.
  const showAuthButtons = !isAuthenticated;
  const className = [
    'navbar',
    variant === 'hero' && 'navbar--hero',
    floating && 'navbar--floating',
    landing && 'navbar--landing',
  ].filter(Boolean).join(' ');

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
