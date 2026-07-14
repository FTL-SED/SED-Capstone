import './CloseButton.css'

function CloseButton({ onClick }) {
  return (
    <button onClick={onClick}>X</button>
  );
}

export default CloseButton;
