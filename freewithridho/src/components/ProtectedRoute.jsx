// ProtectedRoute — redirects unauthenticated users to /login
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner-large"></div>
        <p>Memeriksa sesi login...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    // Jika user biasa mencoba masuk ke halaman admin
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
