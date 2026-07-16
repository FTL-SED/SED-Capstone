import './UpdatePasswordButton.css'

function UpdatePasswordButton({ onClick, loading = false }) {
  return (
    <button
      className={loading ? "update-password-button loading" : "update-password-button"}
      type="button"
      onClick={onClick}
      disabled={loading}>
        {loading ? "Updating..." : "Update password"}
    </button>
  );
}

export default UpdatePasswordButton;
