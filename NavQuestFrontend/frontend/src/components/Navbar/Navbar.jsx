import './Navbar.css';
import Logo from './Logo/Logo.jsx';
import NavLinks from './NavLinks/NavLinks.jsx';
import AuthButtons from './AuthButtons/AuthButtons.jsx'
import AccountIcon from './AccountIcon/AccountIcon.jsx'

function Navbar() {
  return (
    <div>
      <Logo />
      <NavLinks/>
      <AuthButtons/>
      <AccountIcon/>
    </div>
  );
}

export default Navbar;
