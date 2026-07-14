import './MapView.css'
import MapPin from '../MapPin/MapPin.jsx'
import CloseButton from '../CloseButton/CloseButton.jsx'

function MapView({ pins = [] }) {
  return (
    <div>
      <CloseButton />
      {[1, 2, 3, 4, 5].map((n) => (
        <MapPin key={n} number={n} />
      ))}
    </div>
  );
}

export default MapView;
