import Heading from '../Heading/Heading.jsx'
import Subheading from '../Subheading/Subheading.jsx'
import StartPlanningButton from '../StartPlanningButton/StartPlanningButton.jsx'
import './HeroSection.css'

function HeroSection() {
  return (
    <section className="hero-section">
      <Heading />
      <Subheading />
      <StartPlanningButton />
    </section>
  );
}

export default HeroSection;
