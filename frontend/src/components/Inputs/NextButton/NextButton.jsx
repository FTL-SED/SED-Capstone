import './NextButton.css'

function NextButton({ onClick }) {
  return (
    <button className="next-button" type="button" onClick={onClick}>
      Next
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </button>
  );
}

export default NextButton;
