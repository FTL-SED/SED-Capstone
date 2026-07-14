import './PinTiming.css'

function PinTiming({ startTime, endTime }) {
  return (
    <p className="pin-timing">{startTime} - {endTime}</p>
  );
}

export default PinTiming;
