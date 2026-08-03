import { useEffect, useRef, useState } from 'react'

// Reveal-on-scroll: returns a ref to attach to an element and a boolean that
// flips true the first time the element scrolls into view. Used by landing-page
// sections to fade/slide their content in as the user scrolls, instead of
// everything being visible (and static) from the first paint.
//
// One-shot by default: once revealed it stays revealed (we stop observing), so
// scrolling back up doesn't re-hide or re-animate it. `rootMargin` lets a caller
// trigger a little before the element's top edge reaches the viewport bottom.
export function useReveal({ rootMargin = '0px 0px -12% 0px', threshold = 0.15 } = {}) {
  const ref = useRef(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // No IntersectionObserver (very old browsers / SSR) — reveal so content is
    // never stuck hidden. Deferred out of the effect body so it doesn't trigger
    // a synchronous cascading render.
    if (typeof IntersectionObserver === 'undefined') {
      const t = setTimeout(() => setRevealed(true), 0)
      return () => clearTimeout(t)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true)
            observer.disconnect()
            break
          }
        }
      },
      { rootMargin, threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, threshold])

  return [ref, revealed]
}
