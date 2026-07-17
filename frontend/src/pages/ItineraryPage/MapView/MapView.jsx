import './MapView.css'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// A numbered teal marker built from HTML (divIcon) so we need no image assets.
const numberedIcon = (n) =>
  L.divIcon({
    className: 'map-view__marker',
    html: `<span class="map-view__marker-num">${n}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

// Pan/zoom the map to fit all markers, and re-measure the container once the
// flex layout has settled (invalidateSize) so tiles fill the full height
// instead of rendering short / cut off.
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    }
    // points identity changes with the itinerary; JSON keys the effect on value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(points)]);
  return null;
}

// Real OpenStreetMap view with a numbered marker per stop (in visit order).
function MapView({ pins = [] }) {
  const located = pins.filter(
    (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number'
  );
  const points = located.map((p) => [p.latitude, p.longitude]);
  const center = points[0] ?? [37.7749, -122.4194]; // fall back to SF center

  // Under React StrictMode (dev), effects mount→unmount→remount, which makes
  // Leaflet's MapContainer throw "already initialized". Mounting the map only
  // after the first commit sidesteps the double-init; harmless in production.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Defer out of the effect body (avoids react-hooks' synchronous-setState
    // warning) and past StrictMode's mount→unmount→remount, so Leaflet only
    // initializes on a stable, committed container.
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!ready) return <div className="map-view" />;

  return (
    <div className="map-view">
      <MapContainer center={center} zoom={13} className="map-view__map" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {located.map((pin, i) => (
          <Marker key={pin.id ?? i} position={[pin.latitude, pin.longitude]} icon={numberedIcon(i + 1)}>
            <Popup>
              <strong>{pin.name}</strong>
            </Popup>
          </Marker>
        ))}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}

export default MapView;
