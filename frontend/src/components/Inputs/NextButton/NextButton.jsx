import './NextButton.css'

function NextButton({ onClick }) {
  return (
    <button className="next-button" onClick={onClick}>next &gt;</button>
  );
}

export default NextButton;
