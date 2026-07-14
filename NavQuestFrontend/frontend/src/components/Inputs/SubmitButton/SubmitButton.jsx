import './SubmitButton.css'

function SubmitButton({ label = "Submit", onClick }) {
  return (
    <button type="submit" onClick={onClick}>{label}</button>
  );
}

export default SubmitButton;
