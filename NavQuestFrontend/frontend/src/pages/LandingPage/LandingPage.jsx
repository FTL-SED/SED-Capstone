import HeroSection from './HeroSection/HeroSection.jsx'
import DemoVideoSection from './DemoVideoSection/DemoVideoSection.jsx'
import './LandingPage.css'

function LandingPage() {
  return (
    <div className="landing-page">
      <HeroSection />
      <DemoVideoSection />
    </div>
  );
}

export default LandingPage;
