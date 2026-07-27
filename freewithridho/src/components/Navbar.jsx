import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Code2, LayoutDashboard, LogOut, LogIn, User, ChevronDown, Package, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/');
  };

  // Get user initials
  const getInitials = (email) => {
    if (!email) return '?';
    return email.substring(0, 2).toUpperCase();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <Code2 className="logo-icon" size={22} />
          <span>FREEWITHRIDHO</span>
        </Link>

        {/* Desktop Links */}
        <div className="navbar-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <Home size={15} /> Home
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

              {/* Profile Dropdown */}
              <div className="profile-dropdown-wrapper" ref={dropdownRef}>
                <button
                  className={`nav-avatar-btn ${dropdownOpen ? 'open' : ''}`}
                  onClick={() => setDropdownOpen(v => !v)}
                  aria-label="User menu"
                >
                  <div className="nav-avatar">{getInitials(user.email)}</div>
                  <span className="nav-display-name">{user.email.split('@')[0]}</span>
                  <ChevronDown size={14} className={`chevron ${dropdownOpen ? 'rotated' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="profile-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-avatar">{getInitials(user.email)}</div>
                      <div>
                        <div className="dropdown-name">{user.email.split('@')[0]}</div>
                        <div className="dropdown-email">{user.email}</div>
                      </div>
                    </div>
                    <div className="dropdown-divider" />
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User size={15} /> Profil & Transaksi
                    </Link>
                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={() => { setDropdownOpen(false); }}
                    >
                      <Package size={15} /> Koleksi Saya
                    </Link>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item danger" onClick={handleLogout}>
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                )}
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

        {/* Mobile Hamburger */}
        <button
          className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(v => !v)}
          aria-label="Menu"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu">
          <Link to="/" className="mobile-link">
            <Home size={15} /> Home
          </Link>
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="mobile-link">
                  <LayoutDashboard size={15} /> Admin Panel
                </Link>
              )}
              <Link to="/profile" className="mobile-link">
                <User size={15} /> Profil & Transaksi
              </Link>
              <div className="mobile-divider" />
              <div className="mobile-user-info">{user.email}</div>
              <button className="mobile-link danger" onClick={handleLogout}>
                <LogOut size={15} /> Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="mobile-link">
              <LogIn size={15} /> Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
