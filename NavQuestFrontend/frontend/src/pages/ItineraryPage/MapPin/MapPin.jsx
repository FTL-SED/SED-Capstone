import './MapPin.css'

function MapPin({ number, onClick }) {
  return (
    <button onClick={onClick}>#{number}</button>
  );
}

export default MapPin;
