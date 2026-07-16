import './CarouselArrow.css'

// Circular carousel control. `direction` picks the glyph/aria-label; `disabled`
// greys it out at the start/end of the track (like the greyed back arrow in the
// design).
function CarouselArrow({ direction = 'forward', onClick, disabled = false }) {
  const isBack = direction === 'back';
  return (
    <button
      type="button"
      className="carousel-arrow"
      onClick={onClick}
      disabled={disabled}
      aria-label={isBack ? 'Scroll back' : 'Scroll forward'}
    >
      {isBack ? '←' : '→'}
    </button>
  );
}

export default CarouselArrow;
