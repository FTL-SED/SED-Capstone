import './CloseButton.css'

function CloseButton({ onClick }) {
  return (
    <button className="close-button" onClick={onClick}>X</button>
  );
}

export default CloseButton;
