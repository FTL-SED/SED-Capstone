import './BackButton.css'

function BackButton({ onClick }) {
  return (
    <button className="back-button" type="button" onClick={onClick}>&lt; back</button>
  );
}

export default BackButton;
