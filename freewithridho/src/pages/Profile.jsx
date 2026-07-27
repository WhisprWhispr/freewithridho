import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Mail, Calendar, ShoppingBag, Download, Clock,
  CheckCircle, XCircle, AlertCircle, LogOut, ChevronRight,
  Package, Wallet, Star, ArrowLeft, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserTransactions } from '../services/projectService';
import './Profile.css';

const STATUS_CONFIG = {
  PAID: { label: 'Lunas', icon: CheckCircle, className: 'status-paid' },
  PENDING: { label: 'Menunggu Bayar', icon: Clock, className: 'status-pending' },
  EXPIRED: { label: 'Kadaluarsa', icon: XCircle, className: 'status-expired' },
  FAILED: { label: 'Gagal', icon: XCircle, className: 'status-failed' },
};

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Get user initials for avatar
  const getInitials = (email) => {
    if (!email) return '?';
    return email.substring(0, 2).toUpperCase();
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Format join date
  const formatJoinDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const data = await getUserTransactions(user.uid);
        setTransactions(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [user, navigate]);

  if (!user) return null;

  const paidTransactions = transactions.filter(t => t.status === 'PAID');
  const pendingTransactions = transactions.filter(t => t.status === 'PENDING');
  const totalSpent = paidTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="profile-page">
      <div className="profile-bg-glow top" />
      <div className="profile-bg-glow bottom" />

      <div className="profile-container">
        {/* Back */}
        <Link to="/" className="back-link">
          <ArrowLeft size={18} /> Kembali ke Home
        </Link>

        {/* Header Card */}
        <div className="profile-hero-card">
          <div className="profile-avatar-ring">
            <div className="profile-avatar">
              {getInitials(user.email)}
            </div>
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{user.displayName || user.email.split('@')[0]}</h1>
            <p className="profile-email">
              <Mail size={14} /> {user.email}
            </p>
            <div className="profile-meta">
              <span className="meta-chip">
                <Calendar size={13} />
                Bergabung {formatJoinDate(user.metadata?.creationTime)}
              </span>
              <span className="meta-chip verified">
                <Star size={13} />
                Member
              </span>
            </div>
          </div>
          <button className="btn-logout-profile" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Stats Row */}
        <div className="profile-stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <ShoppingBag size={22} />
            </div>
            <div>
              <div className="stat-value">{transactions.length}</div>
              <div className="stat-label">Total Transaksi</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <Download size={22} />
            </div>
            <div>
              <div className="stat-value">{paidTransactions.length}</div>
              <div className="stat-label">Berhasil Dibeli</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">
              <Clock size={22} />
            </div>
            <div>
              <div className="stat-value">{pendingTransactions.length}</div>
              <div className="stat-label">Menunggu Bayar</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <Wallet size={22} />
            </div>
            <div>
              <div className="stat-value">Rp {totalSpent.toLocaleString('id-ID')}</div>
              <div className="stat-label">Total Pengeluaran</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <User size={16} /> Profil
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Package size={16} /> Riwayat Transaksi
            {transactions.length > 0 && (
              <span className="tab-badge">{transactions.length}</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <Download size={16} /> Koleksi Saya
            {paidTransactions.length > 0 && (
              <span className="tab-badge green">{paidTransactions.length}</span>
            )}
          </button>
        </div>

        {/* TAB: Overview */}
        {activeTab === 'overview' && (
          <div className="tab-content">
            <div className="info-card">
              <h3 className="info-card-title">Informasi Akun</h3>
              <div className="info-rows">
                <div className="info-row">
                  <span className="info-row-label"><Mail size={15}/> Email</span>
                  <span className="info-row-value">{user.email}</span>
                </div>
                <div className="info-row">
                  <span className="info-row-label"><Calendar size={15}/> Tanggal Daftar</span>
                  <span className="info-row-value">{formatJoinDate(user.metadata?.creationTime)}</span>
                </div>
                <div className="info-row">
                  <span className="info-row-label"><Clock size={15}/> Login Terakhir</span>
                  <span className="info-row-value">{formatJoinDate(user.metadata?.lastSignInTime)}</span>
                </div>
                <div className="info-row">
                  <span className="info-row-label"><User size={15}/> User ID</span>
                  <span className="info-row-value uid">{user.uid}</span>
                </div>
              </div>
            </div>

            {paidTransactions.length > 0 && (
              <div className="info-card recent-purchases">
                <div className="info-card-header">
                  <h3 className="info-card-title">Pembelian Terbaru</h3>
                  <button className="link-btn" onClick={() => setActiveTab('history')}>
                    Lihat Semua <ChevronRight size={14}/>
                  </button>
                </div>
                <div className="recent-list">
                  {paidTransactions.slice(0, 3).map(tx => (
                    <div key={tx.id} className="recent-item">
                      <div className="recent-item-icon">
                        <Package size={18} />
                      </div>
                      <div className="recent-item-info">
                        <span className="recent-item-name">{tx.projectTitle || 'Proyek'}</span>
                        <span className="recent-item-date">{formatDate(tx.createdAt)}</span>
                      </div>
                      <span className="recent-item-amount">Rp {(tx.amount || 0).toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Transaction History */}
        {activeTab === 'history' && (
          <div className="tab-content">
            {loading ? (
              <div className="tab-loading">
                <div className="spinner-large" />
                <p>Memuat riwayat transaksi...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="empty-tab">
                <ShoppingBag size={52} className="empty-icon" />
                <h3>Belum Ada Transaksi</h3>
                <p>Anda belum pernah melakukan transaksi. Jelajahi proyek kami!</p>
                <Link to="/" className="btn btn-primary">Jelajahi Proyek</Link>
              </div>
            ) : (
              <div className="transactions-list">
                {transactions.map(tx => {
                  const cfg = STATUS_CONFIG[tx.status] || STATUS_CONFIG.PENDING;
                  const Icon = cfg.icon;
                  return (
                    <div key={tx.id} className={`transaction-card ${cfg.className}`}>
                      <div className="tx-header">
                        <div className="tx-project-name">
                          <Package size={16} />
                          {tx.projectTitle || 'Proyek'}
                        </div>
                        <div className={`tx-status-badge ${cfg.className}`}>
                          <Icon size={13} />
                          {cfg.label}
                        </div>
                      </div>
                      <div className="tx-details">
                        <div className="tx-detail-item">
                          <span>Ref:</span>
                          <code className="tx-ref">{tx.merchantRef || tx.id}</code>
                        </div>
                        <div className="tx-detail-item">
                          <span>Metode:</span>
                          <span>{tx.paymentMethod || '-'}</span>
                        </div>
                        <div className="tx-detail-item">
                          <span>Tanggal:</span>
                          <span>{formatDate(tx.createdAt)}</span>
                        </div>
                        <div className="tx-detail-item">
                          <span>Jumlah:</span>
                          <span className="tx-amount">Rp {(tx.amount || 0).toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: Library */}
        {activeTab === 'library' && (
          <div className="tab-content">
            {loading ? (
              <div className="tab-loading">
                <div className="spinner-large" />
                <p>Memuat koleksi Anda...</p>
              </div>
            ) : paidTransactions.length === 0 ? (
              <div className="empty-tab">
                <Download size={52} className="empty-icon" />
                <h3>Koleksi Masih Kosong</h3>
                <p>Beli proyek premium untuk bisa mengunduhnya kapan saja dari sini.</p>
                <Link to="/" className="btn btn-primary">Beli Sekarang</Link>
              </div>
            ) : (
              <div className="library-grid">
                {paidTransactions.map(tx => (
                  <div key={tx.id} className="library-card">
                    <div className="library-card-icon">
                      <Package size={28} />
                    </div>
                    <div className="library-card-info">
                      <h4>{tx.projectTitle || 'Proyek Premium'}</h4>
                      <p className="library-card-date">Dibeli {formatDate(tx.createdAt)}</p>
                    </div>
                    {tx.projectId && (
                      <Link
                        to={`/project/${tx.projectId}`}
                        className="btn btn-success library-download-btn"
                      >
                        <Download size={15} /> Unduh
                        <ExternalLink size={13} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
