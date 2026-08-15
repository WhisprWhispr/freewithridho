import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Mail, Calendar, ShoppingBag, Download, Clock,
  CheckCircle, XCircle, AlertCircle, LogOut, ChevronRight,
  Package, Wallet, Star, ArrowLeft, ExternalLink,
  LayoutDashboard, ShieldCheck, Settings, BarChart3, Key, Heart, Share2, MessageCircle, Send, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listenToUserTransactions, getAllProjects } from '../services/projectService';
import { listenToPartnerByUserId } from '../services/partnerService';
import { getWishlist, getWishlistFromFirestore } from '../services/wishlistService';
import { ensureReferralCode, listenToUserProfile, saveReferredBy } from '../services/referralService';
import { toast } from 'react-hot-toast';
import { generatePartnerCertificatePDF, generatePartnerPDF } from '../utils/pdfGenerator';
import ProjectCard from '../components/ProjectCard';
import PartnerBadge, { getBadgeTier } from '../components/PartnerBadge';
import AvatarModal from '../components/AvatarModal';
import { Edit2, ShieldCheck } from 'lucide-react';
import './Profile.css';

const STATUS_CONFIG = {
  PAID: { label: 'Lunas', icon: CheckCircle, className: 'status-paid' },
  PENDING: { label: 'Menunggu Bayar', icon: Clock, className: 'status-pending' },
  EXPIRED: { label: 'Kadaluarsa', icon: XCircle, className: 'status-expired' },
  FAILED: { label: 'Gagal', icon: XCircle, className: 'status-failed' },
};

// ─── Admin Profile View ────────────────────────────────────────
const AdminProfile = ({ user, handleLogout, formatJoinDate }) => {
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  const getInitials = (email) => {
    if (!email) return '?';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="profile-page">
      <div className="profile-bg-glow top" />
      <div className="profile-bg-glow bottom" />

      <div className="profile-container">
        <Link to="/" className="back-link">
          <ArrowLeft size={18} /> Kembali ke Home
        </Link>

        {/* Admin Hero Card */}
        <div className="profile-hero-card admin-hero-card">
          <div className="profile-avatar-ring admin-ring" style={{ position: 'relative' }}>
            <div className="profile-avatar admin-avatar" style={{ overflow: 'hidden', position: 'relative' }}>
              {currentUser.photoURL ? (
                <>
                  <img src={currentUser.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {currentUser.photoURL.includes('#verified') && (
                    <div style={{ position: 'absolute', bottom: '0px', right: '0px', background: '#3b82f6', borderRadius: '50%', padding: '4px', border: '2px solid #0f172a', display: 'flex', zIndex: 5 }}>
                      <ShieldCheck size={16} color="white" />
                    </div>
                  )}
                </>
              ) : (
                getInitials(currentUser.email)
              )}
            </div>
            <button className="edit-avatar-btn" onClick={() => setShowAvatarModal(true)} style={{ position: 'absolute', bottom: 0, right: 0, background: '#3b82f6', border: 'none', borderRadius: '50%', padding: '0.4rem', cursor: 'pointer', color: 'white', zIndex: 10 }} title="Ganti Avatar">
              <Edit2 size={14} />
            </button>
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{currentUser.displayName || currentUser.email.split('@')[0]}</h1>
            <p className="profile-email">
              <Mail size={14} /> {user.email}
            </p>
            <div className="profile-meta">
              <span className="meta-chip">
                <Calendar size={13} />
                Bergabung {formatJoinDate(user.metadata?.creationTime)}
              </span>
              <span className="meta-chip admin-badge">
                <ShieldCheck size={13} />
                Administrator
              </span>
              <PartnerBadge tier="admin" size="sm" />
            </div>
          </div>
          <button className="btn-logout-profile" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Admin Quick Actions */}
        <div className="admin-quick-actions">
          <h2 className="admin-section-title"><LayoutDashboard size={18}/> Panel Admin</h2>
          <div className="admin-action-grid">
            <Link to="/admin" className="admin-action-card">
              <div className="action-icon blue">
                <LayoutDashboard size={24} />
              </div>
              <div>
                <div className="action-title">Dashboard Admin</div>
                <div className="action-desc">Kelola proyek & statistik</div>
              </div>
              <ChevronRight size={18} className="action-arrow" />
            </Link>
            <Link to="/admin" className="admin-action-card">
              <div className="action-icon purple">
                <Package size={24} />
              </div>
              <div>
                <div className="action-title">Kelola Proyek</div>
                <div className="action-desc">Tambah, edit, hapus proyek</div>
              </div>
              <ChevronRight size={18} className="action-arrow" />
            </Link>
            <Link to="/admin" className="admin-action-card">
              <div className="action-icon green">
                <BarChart3 size={24} />
              </div>
              <div>
                <div className="action-title">Laporan & Statistik</div>
                <div className="action-desc">Pantau pendapatan & transaksi</div>
              </div>
              <ChevronRight size={18} className="action-arrow" />
            </Link>
            <Link to="/admin" className="admin-action-card">
              <div className="action-icon yellow">
                <Key size={24} />
              </div>
              <div>
                <div className="action-title">Pengaturan API</div>
                <div className="action-desc">Konfigurasi INSTANPAY API Key</div>
              </div>
              <ChevronRight size={18} className="action-arrow" />
            </Link>
          </div>
        </div>

        {/* Admin Info Card */}
        <div className="info-card" style={{ marginTop: '1.5rem' }}>
          <h3 className="info-card-title">Informasi Akun Admin</h3>
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
      </div>
      <AvatarModal isOpen={showAvatarModal} onClose={() => setShowAvatarModal(false)} user={currentUser} onAvatarUpdated={(url) => setCurrentUser({...currentUser, photoURL: url})} isAdmin={true} />
    </div>
  );
};

// ─── Member Profile View ────────────────────────────────────────
const MemberProfile = ({ user, handleLogout, formatJoinDate, formatDate, partner }) => {
  const [currentUser, setCurrentUser] = useState(user);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [favoriteProjects, setFavoriteProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [referralData, setReferralData] = useState({ code: '', balance: 0, count: 0, referredBy: null });
  const [copiedRef, setCopiedRef] = useState(false);
  const [referredByInput, setReferredByInput] = useState('');
  const [savingReferredBy, setSavingReferredBy] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const getInitials = (email) => {
    if (!email) return '?';
    return email.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    // Real-time listener for transactions (otomatis update saat status berubah)
    const unsubscribeTrx = listenToUserTransactions(user.uid, (transData) => {
      setTransactions(transData);
      setLoading(false);
    });

    // Load wishlist & other data
    const fetchData = async () => {
      try {
        const allProjects = await getAllProjects();
        const wishlistIds = await getWishlistFromFirestore(user.uid);
        const favs = allProjects.filter(p => wishlistIds.includes(p.id));
        setFavoriteProjects(favs);
        // Ensure referral code exists (creates it if not present)
        await ensureReferralCode(user.uid);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();

    // Real-time listener for referral balance & count
    const unsubscribeProfile = listenToUserProfile(user.uid, (profile) => {
      if (profile) {
        setReferralData({
          code: profile.referralCode || '',
          balance: profile.referralBalance || 0,
          count: profile.referralCount || 0,
          referredBy: profile.referredBy || null
        });
        if (profile.referredBy) {
          setReferredByInput(profile.referredBy);
        }
      }
    });

    return () => {
      unsubscribeTrx();
      unsubscribeProfile();
    };
  }, [user.uid]);

  const paidTransactions = transactions.filter(t => t.status === 'PAID');
  const pendingTransactions = transactions.filter(t => t.status === 'PENDING');
  const totalSpent = paidTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="profile-page">
      <div className="profile-bg-glow top" />
      <div className="profile-bg-glow bottom" />

      <div className="profile-container">
        <Link to="/" className="back-link">
          <ArrowLeft size={18} /> Kembali ke Home
        </Link>

        {/* Header Card */}
        <div className="profile-hero-card">
          <div className="profile-avatar-ring" style={{ position: 'relative' }}>
            <div className="profile-avatar" style={{ overflow: 'hidden', position: 'relative' }}>
              {currentUser.photoURL ? (
                <>
                  <img src={currentUser.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {currentUser.photoURL.includes('#verified') && (
                    <div style={{ position: 'absolute', bottom: '0px', right: '0px', background: '#3b82f6', borderRadius: '50%', padding: '4px', border: '2px solid #0f172a', display: 'flex', zIndex: 5 }}>
                      <ShieldCheck size={16} color="white" />
                    </div>
                  )}
                </>
              ) : (
                getInitials(currentUser.email)
              )}
            </div>
            <button className="edit-avatar-btn" onClick={() => setShowAvatarModal(true)} style={{ position: 'absolute', bottom: 0, right: 0, background: '#3b82f6', border: 'none', borderRadius: '50%', padding: '0.4rem', cursor: 'pointer', color: 'white', zIndex: 10 }} title="Ganti Avatar">
              <Edit2 size={14} />
            </button>
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{currentUser.displayName || currentUser.email.split('@')[0]}</h1>
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
              {partner && getBadgeTier(partner.totalEarnings !== undefined ? partner.totalEarnings : partner.balance) > 0 && (
                <PartnerBadge tier={getBadgeTier(partner.totalEarnings !== undefined ? partner.totalEarnings : partner.balance)} size="sm" />
              )}
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
          <button
            className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            <Heart size={16} /> Favorit
            {favoriteProjects.length > 0 && (
              <span className="tab-badge" style={{ background: '#f43f5e', color: '#fff' }}>{favoriteProjects.length}</span>
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

            {/* Notifikasi Mitra Disetujui */}
            {partner && partner.status === 'approved' && (
              <div className="info-card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.4)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(15, 23, 42, 0.4))' }}>
                <h3 className="info-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                  <ShieldCheck size={20} /> Selamat! Anda Resmi Menjadi Mitra
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                  Pendaftaran kemitraan Anda telah disetujui. Anda sekarang bisa mengunggah dan menjual Source Code Anda sendiri, mendapatkan komisi 70%, dan menikmati berbagai keuntungan lainnya sebagai Mitra Resmi FREEWITHRIDHO.
                </p>
                
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => generatePartnerPDF({ 
                      ...partner, 
                      fullName: partner.fullName || user.displayName || user.email.split('@')[0], 
                      email: user.email 
                    })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.65rem 1.25rem',
                      borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <Download size={16} /> Unduh Formulir Registrasi (PDF)
                  </button>

                  <button
                    onClick={() => generatePartnerCertificatePDF(user, partner)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none', color: 'white', padding: '0.65rem 1.25rem',
                      borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem',
                      cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <Download size={16} /> Unduh Sertifikat Kemitraan (PDF)
                  </button>
                </div>
              </div>
            )}

            {/* Set Referral Teman Card */}
            <div className="info-card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(15, 23, 42, 0.4))' }}>
              <h3 className="info-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🎁 Kode Referral Teman
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Masukkan kode referral temanmu di sini. Temanmu akan langsung mendapatkan komisi <strong style={{ color: '#10b981' }}>Rp 250</strong> karena berhasil mengundangmu bergabung!
              </p>
              
              <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px' }}>
                <input
                  type="text"
                  placeholder="Contoh: REF-ABCD1234"
                  value={referredByInput}
                  onChange={(e) => setReferredByInput(e.target.value.toUpperCase())}
                  disabled={referralData.referredBy || savingReferredBy}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    color: 'white',
                    fontFamily: 'monospace',
                    fontSize: '1rem'
                  }}
                />
                {!referralData.referredBy && (
                  <button
                    onClick={async () => {
                      if (!referredByInput.trim()) return;
                      setSavingReferredBy(true);
                      const res = await saveReferredBy(user.uid, referredByInput);
                      if (res.valid) {
                        toast.success(res.message);
                      } else {
                        toast.error(res.message);
                      }
                      setSavingReferredBy(false);
                    }}
                    disabled={!referredByInput.trim() || savingReferredBy}
                    style={{
                      background: '#8b5cf6',
                      border: 'none',
                      color: 'white',
                      padding: '0 1.5rem',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: (!referredByInput.trim() || savingReferredBy) ? 0.5 : 1
                    }}
                  >
                    {savingReferredBy ? 'Menyimpan...' : 'Simpan'}
                  </button>
                )}
              </div>
              {referralData.referredBy && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle size={14} /> Kode referral teman aktif dan otomatis terpasang.
                </div>
              )}
            </div>

            {/* Referral Card */}
            <div className="info-card referral-card">
              <h3 className="info-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🤝 Program Referral
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Bagikan kode referral Anda dan dapatkan komisi <strong style={{ color: '#10b981' }}>Rp 250</strong> secara instan setiap ada teman yang berhasil mendaftar menggunakan kode Anda!
              </p>
              <div className="referral-code-box">
                <span className="referral-code-text">{referralData.code || 'Memuat...'}</span>
                <button
                  className="btn-copy-ref"
                  onClick={() => {
                    navigator.clipboard.writeText(referralData.code);
                    setCopiedRef(true);
                    setTimeout(() => setCopiedRef(false), 2000);
                  }}
                >
                  {copiedRef ? '✓ Disalin!' : 'Salin Kode'}
                </button>
              </div>

              {/* Share Buttons */}
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.6rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Bagikan Via:</p>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {/* WhatsApp */}
                  <button
                    onClick={() => {
                      const text = encodeURIComponent(
                        `🚀 *FREEWITHRIDHO — Premium Source Code Marketplace*\n\n` +
                        `Hei! Saya ingin mengajak kamu bergabung bersama ribuan developer di *FREEWITHRIDHO* — marketplace terpercaya untuk source code berkualitas premium.\n\n` +
                        `✅ Source code siap pakai & terverifikasi\n` +
                        `✅ Harga terjangkau, kualitas profesional\n` +
                        `✅ Dukungan komunitas developer aktif\n\n` +
                        `Gunakan kode referral saya saat mendaftar dan kita sama-sama dapat keuntungan!\n\n` +
                        `🎁 Kode Referral: *${referralData.code}*\n\n` +
                        `👉 Daftar sekarang di: ${window.location.origin}`
                      );
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      background: 'linear-gradient(135deg, #25d366, #128c7e)',
                      border: 'none', color: 'white', padding: '0.55rem 1rem',
                      borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem',
                      cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(37,211,102,0.3)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <MessageCircle size={15} /> WhatsApp
                  </button>

                  {/* Telegram */}
                  <button
                    onClick={() => {
                      const text = encodeURIComponent(
                        `🚀 FREEWITHRIDHO — Premium Source Code Marketplace\n\n` +
                        `Bergabunglah bersama saya di FREEWITHRIDHO! Platform marketplace source code terpercaya untuk para developer profesional.\n\n` +
                        `✅ Ribuan source code premium\n✅ Harga kompetitif\n✅ Komunitas developer aktif\n\n` +
                        `Gunakan kode referral saya: ${referralData.code}\n\n` +
                        `Daftar sekarang: ${window.location.origin}`
                      );
                      window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${text}`, '_blank');
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      background: 'linear-gradient(135deg, #229ed9, #1a7abf)',
                      border: 'none', color: 'white', padding: '0.55rem 1rem',
                      borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem',
                      cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(34,158,217,0.3)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <Send size={15} /> Telegram
                  </button>

                  {/* Twitter/X */}
                  <button
                    onClick={() => {
                      const text = encodeURIComponent(
                        `🚀 Saya baru saja bergabung di @FreeWithRidho — marketplace source code premium terbaik!\n\n` +
                        `Gunakan kode referral saya dan dapatkan keuntungan bersama! 🎁\n` +
                        `Kode: ${referralData.code}\n\n` +
                        `👉 ${window.location.origin} #developer #sourcecode #webdev`
                      );
                      window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      background: 'linear-gradient(135deg, #1da1f2, #0d8ecf)',
                      border: 'none', color: 'white', padding: '0.55rem 1rem',
                      borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem',
                      cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(29,161,242,0.3)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <Share2 size={15} /> Twitter / X
                  </button>

                  {/* Bagikan Tautan */}
                  <button
                    onClick={() => {
                      const proMessage =
                        `🚀 FREEWITHRIDHO — Premium Source Code Marketplace\n\n` +
                        `Halo! Saya mengundang Anda untuk bergabung di FREEWITHRIDHO, platform marketplace source code premium terpercaya untuk para developer profesional Indonesia.\n\n` +
                        `🔥 Keunggulan FREEWITHRIDHO:\n` +
                        `✅ Ribuan source code berkualitas & terverifikasi\n` +
                        `✅ Harga terjangkau, nilai profesional\n` +
                        `✅ Langsung unduh setelah pembayaran\n` +
                        `✅ Komunitas developer aktif & supportif\n\n` +
                        `🎁 Gunakan kode referral saya saat mendaftar:\n` +
                        `   ➤  Kode: ${referralData.code}\n\n` +
                        `🔗 Daftar & Mulai Jelajahi Sekarang:\n` +
                        `   ${window.location.origin}\n\n` +
                        `— Salam dari sesama developer 👨‍💻`;

                      if (navigator.share) {
                        navigator.share({
                          title: 'FREEWITHRIDHO — Premium Source Code Marketplace',
                          text: proMessage,
                          url: window.location.origin
                        }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(proMessage);
                        toast.success('✅ Pesan referral profesional berhasil disalin! Tinggal tempel & kirim.');
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      background: 'rgba(99,102,241,0.15)',
                      border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8', padding: '0.55rem 1rem',
                      borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <Share2 size={15} /> Salin Pesan
                  </button>
                </div>
              </div>

              <div className="referral-stats" style={{ marginTop: '1.25rem' }}>
                <div className="ref-stat">
                  <span className="ref-stat-value">{referralData.count}</span>
                  <span className="ref-stat-label">Referral Berhasil</span>
                </div>
                <div className="ref-stat">
                  <span className="ref-stat-value">Rp {referralData.balance.toLocaleString('id-ID')}</span>
                  <span className="ref-stat-label">Komisi Terkumpul</span>
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
                  const isPending = tx.status === 'PENDING';
                  
                  // Cek apakah kadaluarsa (24 jam)
                  let isExpired = false;
                  if (isPending && tx.createdAt) {
                    const txTime = typeof tx.createdAt.toMillis === 'function' 
                      ? tx.createdAt.toMillis() 
                      : (tx.createdAt.seconds ? tx.createdAt.seconds * 1000 : new Date(tx.createdAt).getTime());
                    
                    if (Date.now() - txTime > 24 * 60 * 60 * 1000) {
                      isExpired = true;
                    }
                  }

                  const handleTransactionClick = () => {
                    setSelectedTransaction({ ...tx, isExpired });
                  };

                  return (
                    <div 
                      key={tx.id} 
                      className={`transaction-card ${cfg.className} clickable-trx`}
                      onClick={handleTransactionClick}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div className="tx-header">
                        <div className="tx-project-name">
                          <Package size={16} />
                          {tx.projectTitle || 'Proyek'}
                        </div>
                        <div className={`tx-status-badge ${cfg.className}`}>
                          <Icon size={13} />
                          {isExpired ? 'Kedaluwarsa' : cfg.label}
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
                      <div style={{ marginTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.75rem', color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Klik untuk melihat detail transaksi <ChevronRight size={14} />
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
                        <ExternalLink size={15} /> Lihat Detail
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: Favorites */}
        {activeTab === 'favorites' && (
          <div className="tab-content">
            {loading ? (
              <div className="tab-loading">
                <div className="spinner-large" />
                <p>Memuat favorit Anda...</p>
              </div>
            ) : favoriteProjects.length === 0 ? (
              <div className="empty-tab">
                <Heart size={52} className="empty-icon" />
                <h3>Belum Ada Proyek Favorit</h3>
                <p>Cari proyek menarik dan tambahkan ke daftar favorit Anda.</p>
                <Link to="/" className="btn btn-primary">Eksplorasi Proyek</Link>
              </div>
            ) : (
              <div className="projects-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {favoriteProjects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DETAIL TRANSAKSI */}
      {selectedTransaction && (
        <div className="modal-overlay" onClick={() => setSelectedTransaction(null)}>
          <div className="modal-content admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Detail Transaksi</h2>
              <button className="btn-close" onClick={() => setSelectedTransaction(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.2rem' }}>Status Pembayaran</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: selectedTransaction.status === 'PAID' ? '#10b981' : (selectedTransaction.isExpired ? '#ef4444' : '#f59e0b') }}>
                  {selectedTransaction.isExpired ? 'KEDALUWARSA' : (selectedTransaction.status === 'PAID' ? 'LUNAS' : 'MENUNGGU PEMBAYARAN')}
                </div>
              </div>
              
              <div className="info-row">
                <span className="info-row-label">Order ID</span>
                <span className="info-row-value">{selectedTransaction.merchantRef || selectedTransaction.id}</span>
              </div>
              <div className="info-row">
                <span className="info-row-label">Nama Proyek</span>
                <span className="info-row-value">{selectedTransaction.projectTitle}</span>
              </div>
              <div className="info-row">
                <span className="info-row-label">Tanggal Transaksi</span>
                <span className="info-row-value">{formatDate(selectedTransaction.createdAt)}</span>
              </div>
              <div className="info-row">
                <span className="info-row-label">Total Pembayaran</span>
                <span className="info-row-value" style={{ fontWeight: 'bold', color: '#38bdf8' }}>
                  Rp {(selectedTransaction.amount || 0).toLocaleString('id-ID')}
                </span>
              </div>

              {selectedTransaction.status === 'PENDING' && !selectedTransaction.isExpired && (
                <div style={{ marginTop: '1rem' }}>
                  <button 
                    onClick={() => navigate(`/checkout/${selectedTransaction.projectId}`)}
                    style={{
                      width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
                    }}
                  >
                    <Wallet size={18} /> Lanjutkan Pembayaran Sekarang
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                    Selesaikan pembayaran sebelum batas waktu (24 jam) habis.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <AvatarModal isOpen={showAvatarModal} onClose={() => setShowAvatarModal(false)} user={currentUser} onAvatarUpdated={(url) => setCurrentUser({...currentUser, photoURL: url})} isAdmin={false} />
    </div>
  );
};

// ─── Main Profile Component ────────────────────────────────────
const Profile = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

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
    
    // Listen to partner status
    const unsubscribe = listenToPartnerByUserId(user.uid, (data) => {
      setPartner(data);
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, navigate]);

  if (!user) return null;

  if (isAdmin) {
    return <AdminProfile user={user} handleLogout={handleLogout} formatJoinDate={formatJoinDate} />;
  }

  return <MemberProfile user={user} handleLogout={handleLogout} formatJoinDate={formatJoinDate} formatDate={formatDate} partner={partner} />;
};

export default Profile;







