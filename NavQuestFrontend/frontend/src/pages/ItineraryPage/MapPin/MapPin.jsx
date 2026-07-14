import './MapPin.css'

function MapPin({ number, onClick }) {
  return (
    <button className="map-pin" onClick={onClick}>#{number}</button>
  );
}

export default MapPin;
