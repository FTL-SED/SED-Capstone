import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
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
  const isAuthPage = pathname === '/login' || pathname === '/register';

  // by using local storage, if the page references, but current user still stays same,
  // the isAuthenticated details wont be forgotted
  const [currentUser, setCurrentUser] = useState(
    () => JSON.parse(localStorage.getItem("currentUser")) || null
  );

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("currentUser");
    }
  }, [currentUser]);

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
          <Route path="/home" element={<HomePage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/create" element={<CreateItineraryPage />} />
          <Route path="/loading" element={<LoadingPage />} />
          <Route path="/itinerary/:id" element={<ItineraryPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App