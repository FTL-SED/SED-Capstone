import './PinImage.css'

const DEFAULT_PIN_IMAGE = "https://placehold.net/default.png";

function PinImage({ src, alt }) {
  return (
    <img className="pin-image" src={src || DEFAULT_PIN_IMAGE} alt={alt || "pin"} />
  );
}

export default PinImage;
