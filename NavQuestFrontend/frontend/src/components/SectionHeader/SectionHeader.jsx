import './SectionHeader.css'

function SectionHeader({ title, children }) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export default SectionHeader;
