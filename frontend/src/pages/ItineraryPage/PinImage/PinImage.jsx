import './PinImage.css'

function PinImage({ src, alt }) {
  return (
    <img className="pin-image" src={src} alt={alt || "pin"} />
  );
}

export default PinImage;
