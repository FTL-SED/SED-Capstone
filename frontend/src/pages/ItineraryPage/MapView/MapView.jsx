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

// Keep Leaflet's internal size in sync with its container. Leaflet caches the
// container size at init; if the flex layout resolves the real height AFTER
// that (which left the map showing tiles for only a thin strip), it never
// re-measures on its own. A ResizeObserver calls invalidateSize on every real
// size change, and we refit the markers so they stay framed.
function MapResizer({ points }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const refit = () => {
      map.invalidateSize();
      if (points.length === 1) {
        map.setView(points[0], 14);
      } else if (points.length > 1) {
        map.fitBounds(points, { padding: [40, 40] });
      }
    };
    const observer = new ResizeObserver(refit);
    observer.observe(container);
    refit(); // run once immediately for the common case
    return () => observer.disconnect();
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
        {/* CARTO Voyager basemap: a soft, muted, low-contrast style close to
            Google Maps' look — free and keyless, unlike the harsh, heavily
            saturated raw OpenStreetMap raster tiles. */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        {located.map((pin, i) => (
          <Marker key={pin.id ?? i} position={[pin.latitude, pin.longitude]} icon={numberedIcon(i + 1)}>
            <Popup>
              <strong>{pin.name}</strong>
            </Popup>
          </Marker>
        ))}
        <MapResizer points={points} />
      </MapContainer>
    </div>
  );
}

export default MapView;
