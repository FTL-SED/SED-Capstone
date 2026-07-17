import './AccountIcon.css'
import accountIcon from '../../../assets/account_icon.png'
import { Link } from 'react-router-dom'

function AccountIcon({ currentUser }) {
  return (
    <Link to="/account" className="account-icon">
        <img src={currentUser?.avatarUrl || accountIcon} alt="Account" />
    </Link>

  );
}

export default AccountIcon;
