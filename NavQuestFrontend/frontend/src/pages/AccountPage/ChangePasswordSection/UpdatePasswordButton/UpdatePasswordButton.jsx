import './UpdatePasswordButton.css'

function UpdatePasswordButton({ onClick }) {
  return (
    <button className="update-password-button" type="button" onClick={onClick}>Update password</button>
  );
}

export default UpdatePasswordButton;
