import './CardCarousel.css'
import ItineraryCard from '../ItineraryCard/ItineraryCard.jsx'
import CarouselArrow from '../CarouselArrow/CarouselArrow.jsx'

function CardCarousel({ itineraries = [] }) {
  return (
    <div className="card-carousel">
      {itineraries.map((itinerary) => (
        <ItineraryCard key={itinerary.id} itinerary={itinerary} />
      ))}
      <CarouselArrow />
    </div>
  );
}

export default CardCarousel;
