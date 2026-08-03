import './Reveal.css'
import { useReveal } from '../../hooks/useReveal.js'

// Wraps content so it fades/slides into place the first time it scrolls into
// view. `direction` sets where it eases in from (up | left | right); `delay`
// (ms) staggers siblings. Renders a plain div, so it drops into existing layout
// without changing it. Motion is CSS-driven and respects prefers-reduced-motion.
function Reveal({ children, direction = 'up', delay = 0, className = '', as: Tag = 'div' }) {
  const [ref, revealed] = useReveal()
  const classes = [
    'reveal',
    `reveal--${direction}`,
    revealed ? 'reveal--in' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag ref={ref} className={classes} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  )
}

export default Reveal
