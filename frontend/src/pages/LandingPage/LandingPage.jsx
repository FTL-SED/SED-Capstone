import HeroSection from './HeroSection/HeroSection.jsx'
import ChaosToClaritySection from './ChaosToClaritySection/ChaosToClaritySection.jsx'
import './LandingPage.css'

/*
 * The landing page: the hero, then a single flat green field with one straight
 * road running down its centre. Content will be layered onto the field later.
 */
function LandingPage() {
  return (
    <div className="landing-page">
      <HeroSection />
      <div className="journey">
        <ChaosToClaritySection />
      </div>
    </div>
  );
}

export default LandingPage;
