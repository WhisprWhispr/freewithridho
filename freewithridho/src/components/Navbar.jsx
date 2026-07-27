import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Code2, LayoutDashboard, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <Code2 className="logo-icon" size={22} />
          <span>FREEWITHRIDHO</span>
        </Link>

        <div className="navbar-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>

          {user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`nav-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}
                >
                  <LayoutDashboard size={16} />
                  Admin Panel
                </Link>
              )}
              <div className="nav-user">
                <span className="nav-email">{user.email}</span>
                <button className="btn-logout" onClick={handleLogout} title="Logout">
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className={`nav-link admin-link ${location.pathname === '/login' ? 'active' : ''}`}
            >
              <LogIn size={16} />
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
