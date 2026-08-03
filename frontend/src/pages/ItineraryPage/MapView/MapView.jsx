import './MapView.css'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'

// A numbered orange marker built from HTML (divIcon) so we need no image assets.
const numberedIcon = (n) =>
  L.divIcon({
    className: 'map-view__marker',
    html: `<span class="map-view__marker-num">${n}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

// Grey variant for stops that fall outside the group's travel radius. Color
// alone isn't enough — the popup also says "Outside radius".
const mutedIcon = (n) =>
  L.divIcon({
    className: 'map-view__marker map-view__marker--out',
    html: `<span class="map-view__marker-num">${n}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const EARTH_RADIUS_MILES = 3958.8;
const toRad = (d) => (d * Math.PI) / 180;
function haversineMi(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

// The lat/lng bounding-box corners of a radius (in miles) around a point, so
// fitBounds always frames the whole circle — not just its center.
function circleBoundsPoints(center, radiusMi) {
  const latDelta = radiusMi / 69;
  const lonDelta = radiusMi / (69 * Math.cos((center.lat * Math.PI) / 180));
  return [
    [center.lat + latDelta, center.lng],
    [center.lat - latDelta, center.lng],
    [center.lat, center.lng + lonDelta],
    [center.lat, center.lng - lonDelta],
  ];
}

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
function MapView({ pins = [], meetingPoint = null, radiusMi = null }) {
  const located = pins.filter(
    (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number'
  );
  const points = located.map((p) => [p.latitude, p.longitude]);
  const center = points[0] ?? [37.7749, -122.4194]; // fall back to SF center

  // The radius is opt-in: the data exists for the owner, but we only draw the
  // circle/legend/muting once the user turns it on via the on-map toggle. Off by
  // default so the map loads clean.
  const radiusAvailable = meetingPoint != null && radiusMi != null;
  const [radiusOn, setRadiusOn] = useState(false);
  const showRadius = radiusAvailable && radiusOn;
  // Include the circle's bounding box corners so the whole circle is visible on load.
  const framePoints = showRadius
    ? [...points, ...circleBoundsPoints(meetingPoint, radiusMi)]
    : points;
  const isOutside = (pin) =>
    showRadius && haversineMi({ lat: pin.latitude, lng: pin.longitude }, meetingPoint) > radiusMi;

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
        {showRadius && (
          <Circle
            center={[meetingPoint.lat, meetingPoint.lng]}
            radius={radiusMi * 1609.34}
            pathOptions={{
              color: '#0f766e',
              weight: 2,
              fillColor: '#0d9488',
              fillOpacity: 0.1,
            }}
            interactive={false}
          />
        )}
        {located.map((pin, i) => {
          const outside = isOutside(pin);
          return (
            <Marker
              key={pin.id ?? i}
              position={[pin.latitude, pin.longitude]}
              icon={outside ? mutedIcon(i + 1) : numberedIcon(i + 1)}
            >
              <Popup>
                <strong>{pin.name}</strong>
                {outside && <span className="map-view__popup-note"> · Outside radius</span>}
              </Popup>
            </Marker>
          );
        })}
        <MapResizer points={framePoints} />
      </MapContainer>
      {radiusAvailable && (
        <button
          type="button"
          className={`map-view__radius-toggle${radiusOn ? ' map-view__radius-toggle--on' : ''}`}
          onClick={() => setRadiusOn((on) => !on)}
          aria-pressed={radiusOn}
        >
          <span className="map-view__legend-dot" aria-hidden="true" />
          {radiusOn ? 'Hide' : 'Show'} travel radius
        </button>
      )}
      {showRadius && (
        <div className="map-view__legend" aria-label={`Travel radius: within ${radiusMi} miles`}>
          <span className="map-view__legend-dot" aria-hidden="true" />
          Within {radiusMi} mi radius
        </div>
      )}
    </div>
  );
}

export default MapView;
