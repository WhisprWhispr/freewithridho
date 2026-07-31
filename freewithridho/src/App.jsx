import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import ProjectDetail from './pages/ProjectDetail';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Register from './pages/Register';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import Profile from './pages/Profile';
import BecomePartner from './pages/BecomePartner';
import PartnerDashboard from './pages/PartnerDashboard';
import PublicProfile from './pages/PublicProfile';
import { PrivacyPolicy, TermsOfService } from './pages/Legal';
import About from './pages/About';
import PrayerTimes from './pages/PrayerTimes';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="bottom-center" 
        toastOptions={{
          duration: 2500,
          style: {
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            fontSize: '14.5px',
            fontWeight: '500',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 255, 255, 0.05) inset',
            padding: '12px 20px',
            letterSpacing: '0.2px',
          },
          success: {
            style: {
              border: '1px solid rgba(16, 185, 129, 0.4)',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 20px rgba(16, 185, 129, 0.1) inset',
            },
            iconTheme: {
              primary: '#10b981',
              secondary: '#0f172a',
            },
          },
          error: {
            style: {
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 20px rgba(239, 68, 68, 0.1) inset',
            },
            iconTheme: {
              primary: '#ef4444',
              secondary: '#0f172a',
            },
          },
        }}
      />
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/project/:id" element={<ProjectDetail />} />
              <Route path="/checkout/:id" element={<Checkout />} />
              <Route path="/success" element={<Success />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/user/:userId" element={<PublicProfile />} />
              <Route path="/become-partner" element={<BecomePartner />} />
              <Route 
                path="/partner-dashboard" 
                element={
                  <ProtectedRoute>
                    <PartnerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/about" element={<About />} />
              <Route path="/jadwal-sholat" element={<PrayerTimes />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
