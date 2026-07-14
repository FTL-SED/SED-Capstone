import './Step.css'

function Step({ number, label }) {
  return (
    <div><span>{number}</span> <span>{label}</span></div>
  );
}

export default Step;
