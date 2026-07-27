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
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="bottom-center" 
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            fontSize: '14px',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
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
