import './FinishButton.css'

function FinishButton({ onClick, loading = false }) {
  return (
    <button className="finish-button" type="button" onClick={onClick} disabled={loading}>
      {loading ? 'Generating…' : 'finish'}
    </button>
  );
}

export default FinishButton;
