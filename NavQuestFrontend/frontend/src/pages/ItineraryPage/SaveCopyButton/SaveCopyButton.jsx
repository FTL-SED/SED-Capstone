import './SaveCopyButton.css'

function SaveCopyButton({ onClick }) {
  return (
    <button className="save-copy-button" onClick={onClick}>copy</button>
  );
}

export default SaveCopyButton;
