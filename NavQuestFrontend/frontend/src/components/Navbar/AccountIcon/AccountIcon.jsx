import './AccountIcon.css'
import accountIcon from '../../../assets/account_icon.png'
import { Link } from 'react-router-dom'

function AccountIcon() {
  return (
    <Link to="/account">
        <img src={accountIcon} alt="Account" />
    </Link>

  );
}

export default AccountIcon;
