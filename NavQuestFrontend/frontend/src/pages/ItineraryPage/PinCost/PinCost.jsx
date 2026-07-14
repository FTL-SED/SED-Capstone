import './PinCost.css'

function PinCost({ cost }) {
  return (
    <p className="pin-cost">${cost} per person</p>
  );
}

export default PinCost;
