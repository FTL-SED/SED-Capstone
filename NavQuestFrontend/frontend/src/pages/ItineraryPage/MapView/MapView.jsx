import './MapView.css'
import MapPin from '../MapPin/MapPin.jsx'
import CloseButton from '../CloseButton/CloseButton.jsx'

function MapView({ pins = [] }) {
  return (
    <div className="map-view">
      <CloseButton />
      <div className="map-view__pins">
        {[1, 2, 3, 4, 5].map((n) => (
          <MapPin key={n} number={n} />
        ))}
      </div>
    </div>
  );
}

export default MapView;
