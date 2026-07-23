import './Navbar.css';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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

  // Mobile only: the same links move into a slide-in drawer behind a hamburger,
  // so the top bar can shrink to just the wordmark + account icon. Hidden by CSS
  // above the mobile breakpoint, so desktop is untouched.
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Following a link inside the drawer changes the route — close it so the new
  // page isn't left sitting under the overlay.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // While the drawer is open, let Escape close it and freeze the page behind it
  // so the background doesn't scroll under the overlay.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const className = [
    'navbar',
    variant === 'hero' && 'navbar--hero',
    floating && 'navbar--floating',
    landing && 'navbar--landing',
  ].filter(Boolean).join(' ');

  return (
    <header className={className}>
      <div className="navbar__inner">
        {/* Hamburger — only shown at the mobile breakpoint (see Navbar.css). */}
        <button
          type="button"
          className="navbar__menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="navbar-drawer"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="navbar__menu-icon" aria-hidden="true" />
        </button>
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

      {/* Mobile drawer + overlay. Always rendered; slid off-canvas and hidden
          from assistive tech / tab order until opened, and never shown at all
          above the mobile breakpoint. */}
      <div
        className={`navbar__overlay${menuOpen ? ' navbar__overlay--open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside
        id="navbar-drawer"
        className={`navbar__drawer${menuOpen ? ' navbar__drawer--open' : ''}`}
        aria-hidden={!menuOpen}
        aria-label="Navigation"
      >
        <div className="navbar__drawer-header">
          <span className="navbar__drawer-title">Menu</span>
          <button
            type="button"
            className="navbar__drawer-close"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            &times;
          </button>
        </div>
        {showAuthButtons ? (
          <AuthButtons isAuthenticated={isAuthenticated} />
        ) : (
          <NavLinks />
        )}
      </aside>
    </header>
  );
}

export default Navbar;
