import { Routes, Route, useLocation } from 'react-router-dom'
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

  return (
    <div className="app">
      <Navbar />
      <main className={`app__main${isAuthPage ? ' app__main--bare' : ''}`}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
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