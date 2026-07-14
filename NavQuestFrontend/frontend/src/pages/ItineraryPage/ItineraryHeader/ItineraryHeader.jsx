import './ItineraryHeader.css'
import Title from '../Title/Title.jsx'
import Description from '../Description/Description.jsx'
import Author from '../Author/Author.jsx'
import CoverImage from '../CoverImage/CoverImage.jsx'

function ItineraryHeader({ coverImageUrl, title, description, author }) {
  return (
    <header className="itinerary-header">
      <CoverImage src={coverImageUrl} />
      <div className="itinerary-header__content">
        <div className="itinerary-header__text">
          <Title text={title} />
          <Description text={description} />
        </div>
        <Author name={author} />
      </div>
    </header>
  );
}

export default ItineraryHeader;
