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

function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  // by using local storage, if the page references, but current user still stays same,
  // the isAuthenticated details wont be forgotted
  const [currentUser, setCurrentUser] = useState(() => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    const expiresAt = Number(localStorage.getItem("sessionExpiresAt"));
    // Signed out if there's no user, no expiry, or the session has lapsed.
    if (!user || !expiresAt || Date.now() > expiresAt) return null;
    return user;
  });

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
    const timer = setTimeout(signOut, msLeft);
    return () => clearTimeout(timer);
  }, [currentUser, navigate]);

  const isAuthenticated = currentUser !== null;

  return (
    <div className="app">
      <Navbar isAuthenticated={isAuthenticated}/>
      <main className={`app__main${isAuthPage ? ' app__main--bare' : ''}`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/home" replace /> : <LoginPage setCurrentUser={setCurrentUser} />}
          />
          <Route path="/register" element={<RegisterPage/>} />
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
            element={!isAuthenticated ? <Navigate to="/" replace/> : <AccountPage setCurrentUser={setCurrentUser} />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App