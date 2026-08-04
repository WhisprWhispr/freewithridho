import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Code2, LayoutDashboard, LogOut, LogIn, User, ChevronDown, Package, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listenToPartnerByUserId } from '../services/partnerService';
import NotificationBell from './NotificationBell';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [partner, setPartner] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user && !isAdmin) {
      const unsubscribe = listenToPartnerByUserId(user.uid, (data) => {
        setPartner(data);
      });
      return () => unsubscribe();
    }
  }, [user, isAdmin]);

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
          <img src="/FREEWITHRIDHO.jpeg" alt="FREEWITHRIDHO Logo" className="logo-img" />
          <span className="logo-text">FREEWITHRIDHO</span>
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
                        {isAdmin && <div className="dropdown-role-badge">Administrator</div>}
                      </div>
                    </div>
                    <div className="dropdown-divider" />
                    {isAdmin ? (
                      <>
                        <Link
                          to="/admin"
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <LayoutDashboard size={15} /> Dashboard Admin
                        </Link>
                        <Link
                          to="/profile"
                          className="dropdown-item"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <User size={15} /> Info Akun
                        </Link>
                      </>
                    ) : (
                      <>
                        {partner && ['approved', 'suspended', 'banned'].includes(partner.status) && (
                          <button
                            className="dropdown-item"
                            style={{ color: partner.status === 'approved' ? '#60a5fa' : '#ef4444', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                            onClick={(e) => {
                              setDropdownOpen(false);
                              if (partner.status === 'approved') {
                                navigate('/partner-dashboard');
                              } else if (partner.status === 'suspended') {
                                import('react-hot-toast').then(({ toast }) => {
                                  toast.custom((t) => (
                                    <div style={{ background: '#1e293b', border: '1px solid #f59e0b', padding: '1rem', borderRadius: '12px', color: 'white', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                      <div style={{ fontWeight: 'bold', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        ⚠️ Akun Disuspend
                                      </div>
                                      <p style={{ fontSize: '0.85rem', margin: 0, color: '#cbd5e1' }}>Dashboard Anda dikunci sementara. Anda dapat mengajukan banding.</p>
                                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        <button onClick={() => { toast.dismiss(t.id); navigate('/partner-dashboard'); }} style={{ flex: 1, background: '#f59e0b', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Aju Banding</button>
                                        <button onClick={() => toast.dismiss(t.id)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Tutup</button>
                                      </div>
                                    </div>
                                  ), { duration: 5000 });
                                });
                              } else if (partner.status === 'banned') {
                                import('react-hot-toast').then(({ toast }) => {
                                  toast.custom((t) => (
                                    <div style={{ background: '#450a0a', border: '1px solid #dc2626', padding: '1rem', borderRadius: '12px', color: 'white', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                      <div style={{ fontWeight: 'bold', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        🚨 Akun Dibanned
                                      </div>
                                      <p style={{ fontSize: '0.85rem', margin: 0, color: '#fca5a5' }}>Pelanggaran berat. Akun partner dan semua proyek Anda telah dihapus permanen. Tidak ada banding.</p>
                                      <button onClick={() => toast.dismiss(t.id)} style={{ width: '100%', background: '#dc2626', color: 'white', border: 'none', padding: '0.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.5rem' }}>Close</button>
                                    </div>
                                  ), { duration: 5000 });
                                });
                              }
                            }}
                          >
                            <LayoutDashboard size={15} /> Dashboard Partner
                          </button>
                        )}
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
                      </>
                    )}
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

        {/* Bell + Hamburger always visible */}
        <div className="navbar-right-actions">
          <NotificationBell />
          <button
            className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
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
              {partner && partner.status === 'approved' && (
                <Link to="/partner-dashboard" className="mobile-link">
                  <LayoutDashboard size={15} /> Dashboard Partner
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
