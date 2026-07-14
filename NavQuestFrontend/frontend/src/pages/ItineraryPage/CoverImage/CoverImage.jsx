import './CoverImage.css'

function CoverImage({ src, alt }) {
  return (
    <img className="cover-image" src={src} alt={alt || "cover"} />
  );
}

export default CoverImage;
