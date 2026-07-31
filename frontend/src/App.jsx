import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useState, useEffect} from 'react'
import './App.css'
import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import LandingPage from './pages/LandingPage/LandingPage'
import LoginPage from './pages/LoginPage/LoginPage'
import RegisterPage from './pages/RegisterPage/RegisterPage'
import HomePage from './pages/HomePage/HomePage'
import DiscoverPage from './pages/DiscoverPage/DiscoverPage'
import CreateItineraryPage from './pages/CreateItineraryPage/CreateItineraryPage'
import LoadingPage from './pages/LoadingPage/LoadingPage'
import ItineraryPage from './pages/ItineraryPage/ItineraryPage'
import AccountPage from './pages/AccountPage/AccountPage'
import OnboardingPage from './pages/OnboardingPage/OnboardingPage'
import { getCurrentUser } from './lib/currentUser.js'

function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  // Onboarding is post-register but pre-login (still signed out). Like the auth
  // pages it takes over the screen — full-bleed shell (no padded max-width) and
  // no footer — so the wizard is the whole focus. It keeps the in-app hero
  // navbar identity (see isHeroNav).
  const isOnboarding = pathname === '/onboarding';
  // The loading page is a full-screen generation scene, so it hides the footer.
  const isLoading = pathname === '/loading';
  // The itinerary page is a full-bleed split (map + panel) that fills the space
  // between the navbar and footer, so it opts out of the padded, max-width shell.
  const isFullBleed = pathname.startsWith('/itinerary/');
  // The landing hero is a full-bleed cinematic scene, so it opts out of the
  // padded shell and uses the shared navbar's "hero" variant floating over the
  // scene — the same treatment the auth pages use.
  const isLanding = pathname === '/';
  // Pages that carry the warm "hero" navbar identity. The landing + auth pages
  // add the floating (transparent, over-the-scene) behaviour on top; the in-app
  // dashboard / discover / create pages wear the same identity on the standard
  // sticky bar so the navbar looks consistent across them.
  // Onboarding reuses the AuthCard scene, which (like the auth pages) is built
  // for a navbar that FLOATS over it — taking zero layout height so the scene's
  // 100vh fills the viewport exactly. Without this it'd sit in-flow and push the
  // 100vh scene down by the navbar height, forcing a scrollbar.
  const isFloatingNav = isLanding || isAuthPage || isOnboarding;
  const isHeroNav = isFloatingNav ||
    pathname === '/home' || pathname === '/discover' || pathname === '/create' ||
    pathname === '/account' || isFullBleed;

  // by using local storage, if the page references, but current user still stays same,
  // the isAuthenticated details wont be forgotted
  const [currentUser, setCurrentUser] = useState(() => {
    const user = getCurrentUser();
    const expiresAt = Number(localStorage.getItem("sessionExpiresAt"));
    // Signed out if there's no user, no expiry, or the session has lapsed.
    if (!user || !expiresAt || Date.now() > expiresAt) return null;
    return user;
  });

  // Reset scroll to the top on every route change. React Router preserves the
  // window scroll position across navigations, so leaving a scrolled-down page
  // (e.g. the profile) would land you part-way down the next one. Jump to top
  // whenever the path changes.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      // sessionExpiresAt and accessToken are set at login from the real Supabase
      // session, so nothing to stamp here.
    } else {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("sessionExpiresAt");
      localStorage.removeItem("accessToken");
    }
  }, [currentUser]);

  // While the app is open, sign out automatically when the session expires.
  useEffect(() => {
    if (!currentUser) return;
    const expiresAt = Number(localStorage.getItem("sessionExpiresAt"));
    const msLeft = expiresAt - Date.now();
    const signOut = () => {
      setCurrentUser(null);
      navigate("/"); // send them back to the landing page
    };
    if (msLeft <= 0) {
      signOut();
      return;
    }
    // setTimeout delays above ~24.8 days (2^31-1 ms) overflow a 32-bit int and
    // fire immediately, which would sign the user straight out. Clamp so a
    // far-future expiry just waits the max instead. (Supabase tokens are ~1h, so
    // this only bites if sessionExpiresAt is ever set unusually far out.)
    const MAX_TIMEOUT = 2 ** 31 - 1;
    const timer = setTimeout(signOut, Math.min(msLeft, MAX_TIMEOUT));
    return () => clearTimeout(timer);
  }, [currentUser, navigate]);

  const isAuthenticated = currentUser !== null;

  return (
    <div className="app">
      <Navbar
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        variant={isHeroNav ? 'hero' : undefined}
        floating={isFloatingNav}
        landing={isLanding}
      />
      <main className={`app__main${isAuthPage || isOnboarding ? ' app__main--bare' : ''}${isFullBleed ? ' app__main--full' : ''}${isLanding ? ' app__main--bare' : ''}`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/home" replace /> : <LoginPage setCurrentUser={setCurrentUser} />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/home" replace /> : <RegisterPage setCurrentUser={setCurrentUser} />}
          />
          {/* Second half of registration. Deliberately NOT gated on
              isAuthenticated: the user is still signed out here (the app stays
              locked until they finish), so OnboardingPage guards itself on the
              session passed via router state and redirects to /register if
              reached directly. */}
          <Route path="/onboarding" element={<OnboardingPage setCurrentUser={setCurrentUser} />} />
          <Route 
            path="/home" 
            element={!isAuthenticated ? <Navigate to="/" replace/> : <HomePage />} />
          <Route 
            path="/discover" 
            element={!isAuthenticated ? <Navigate to="/" replace/> : <DiscoverPage />} />
          <Route 
            path="/create"
            element={!isAuthenticated ? <Navigate to="/" replace/> : <CreateItineraryPage />} />
          <Route 
            path="/loading" 
            element={!isAuthenticated ? <Navigate to="/" replace/> : <LoadingPage />} />
          <Route 
            path="/itinerary/:id" 
            element={!isAuthenticated ? <Navigate to="/" replace/> : <ItineraryPage />} />
          <Route 
            path="/account" 
            element={!isAuthenticated ? <Navigate to="/" replace/> : <AccountPage currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
          {/* Any unknown/invalid path falls through to the landing page. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAuthPage && !isOnboarding && !isFullBleed && !isLoading && <Footer />}
    </div>
  );
}

export default App