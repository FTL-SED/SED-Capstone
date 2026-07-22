import { useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';

// React Router's declarative <BrowserRouter> ignores the <Link viewTransition>
// prop — only the data router (createBrowserRouter/RouterProvider) honors it and
// calls document.startViewTransition. Since this app uses <BrowserRouter>, we
// drive the View Transition ourselves: tag the transition kind on <html>, then
// swap routes inside startViewTransition + flushSync so the browser can capture
// the before/after frames. See App.css for the "ascend" / "card" animations.
export default function useSkyTransition() {
  const navigate = useNavigate();

  // kind: "ascend" (leaving the landing page) or "card" (between auth pages).
  return (to, kind) => {
    document.documentElement.dataset.skyTransition = kind;

    if (typeof document.startViewTransition !== 'function') {
      navigate(to);
      return;
    }

    document.startViewTransition(() => {
      flushSync(() => {
        navigate(to);
      });
    });
  };
}
