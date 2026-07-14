import './CoverImage.css'

function CoverImage({ src, alt }) {
  return (
    <img src={src} alt={alt || "cover"} />
  );
}

export default CoverImage;
