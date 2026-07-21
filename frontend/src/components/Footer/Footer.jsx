import './Footer.css'

function Footer({ variant }) {
  return (
    <footer className={`footer${variant === 'landing' ? ' footer--landing' : ''}`}>
      <p>© 2026 NavQuest</p>
    </footer>
  );
}

export default Footer;
