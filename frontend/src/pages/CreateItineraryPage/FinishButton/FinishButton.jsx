import './FinishButton.css'

function FinishButton({ onClick, loading = false, disabled = false }) {
  return (
    <button
      className="finish-button"
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading ? 'Generating…' : 'finish'}
    </button>
  );
}

export default FinishButton;
