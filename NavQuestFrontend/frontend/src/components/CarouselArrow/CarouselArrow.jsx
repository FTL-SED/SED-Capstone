import './CarouselArrow.css'

function CarouselArrow({ onClick }) {
  return (
    <button className="carousel-arrow" onClick={onClick}>&gt;</button>
  );
}

export default CarouselArrow;
