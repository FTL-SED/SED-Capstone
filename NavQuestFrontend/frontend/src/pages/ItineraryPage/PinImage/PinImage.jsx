import './PinImage.css'

function PinImage({ src, alt }) {
  return (
    <img src={src} alt={alt || "pin"} />
  );
}

export default PinImage;
