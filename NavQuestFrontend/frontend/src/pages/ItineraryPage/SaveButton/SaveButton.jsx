import './SaveButton.css'

function SaveButton({ onClick }) {
  return (
    <button className="save-button" onClick={onClick}>save</button>
  );
}

export default SaveButton;
