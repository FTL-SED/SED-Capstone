import './ItineraryHeader.css'
import Title from '../Title/Title.jsx'
import Description from '../Description/Description.jsx'
import Author from '../Author/Author.jsx'
import CoverImage from '../CoverImage/CoverImage.jsx'

function ItineraryHeader({ coverImageUrl, title, description, author }) {
  return (
    <header>
      <CoverImage src={coverImageUrl} />
      <Title text={title} />
      <Description text={description} />
      <Author name={author} />
    </header>
  );
}

export default ItineraryHeader;
