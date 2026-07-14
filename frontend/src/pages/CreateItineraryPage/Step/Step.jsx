import './Step.css'

function Step({ number, label, active }) {
  return (
    <div className={active ? "step step--active" : "step"}>
      <span className="step__circle">{number}</span>
      <span className="step__label">{label}</span>
    </div>
  );
}

export default Step;
