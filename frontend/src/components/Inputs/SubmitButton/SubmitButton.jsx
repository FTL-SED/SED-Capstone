import './SubmitButton.css'

function SubmitButton({ label = "Submit", onClick, loading = false }) {
  return (
    <button 
      className={loading ? "submit-button loading" : "submit-button"}
      type="submit" 
      onClick={onClick}
      disabled={loading}>
        {label}
      </button>
  );
}

export default SubmitButton;
