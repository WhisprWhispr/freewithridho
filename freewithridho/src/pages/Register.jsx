import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, LogIn, Eye, EyeOff, Gift, Mail, ExternalLink, RefreshCw, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { saveReferredBy, ensureReferralCode } from '../services/referralService';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import './Login.css';
import './Register.css';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState(null);

  // Parse referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    if (refParam) {
      setReferralCode(refParam.toUpperCase());
    }
  }, []);

  // Load Turnstile Script
  useEffect(() => {
    window.handleTurnstileSuccess = (token) => {
      setTurnstileToken(token);
    };
    
    // Check if script already exists to avoid duplicates if navigating back and forth
    if (!document.getElementById('turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'turnstile-script';
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    return () => {
      delete window.handleTurnstileSuccess;
    };
  }, []);

  // ── Verification Modal State ──────────────────────────
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const pollRef = useRef(null);
  const cooldownRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // Start polling Firebase every 3s for email verification
  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        await currentUser.reload();
        if (auth.currentUser?.emailVerified) {
          clearInterval(pollRef.current);
          setIsVerified(true);
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (e) {
        console.warn('Verification poll:', e.message);
      }
    }, 3000);
  };

  const handleCloseModal = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    if (!isVerified) {
      try { await signOut(auth); } catch (_) {}
    }
    setShowVerifyModal(false);
    navigate('/login');
  };

  const handleResend = async (e) => {
    if (e) e.preventDefault();
    if (resendCooldown > 0) return;
    
    // Cek limit harian (3 kali per hari)
    const today = new Date().toDateString();
    const limitData = JSON.parse(localStorage.getItem('resendEmailLimit') || '{}');
    if (limitData.date === today && limitData.count >= 3) {
      toast.error('Batas kirim ulang email tercapai (3x sehari). Coba besok lagi.');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      await sendEmailVerification(currentUser);
      toast.success('📧 Email verifikasi berhasil dikirim ulang!');
      
      // Update limit
      const newCount = limitData.date === today ? (limitData.count || 0) + 1 : 1;
      localStorage.setItem('resendEmailLimit', JSON.stringify({ date: today, count: newCount }));

      setResendCooldown(180); // 3 menit
      cooldownRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      toast.error('Gagal mengirim ulang. Tunggu beberapa menit lagi.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Nama lengkap wajib diisi.'); return; }
    if (!email || !password) { toast.error('Email dan password wajib diisi.'); return; }
    if (!turnstileToken) { toast.error('Silakan selesaikan verifikasi Cloudflare terlebih dahulu.'); return; }

    const toastId = toast.loading('Sedang mendaftar...');
    try {
      setLoading(true);
      const userCredential = await register(email, password, name.trim());
      const uid = userCredential.user.uid;

      await ensureReferralCode(uid);

      if (referralCode.trim()) {
        const result = await saveReferredBy(uid, referralCode.trim());
        if (result.valid) {
          toast.success(`✅ Kode referral dari: ${result.ownerName || 'Pengguna'}`, { duration: 3000 });
        } else {
          toast.error(`⚠️ Kode referral tidak valid`, { duration: 3000 });
        }
      }

      toast.dismiss(toastId);
      setShowVerifyModal(true);
      startPolling();

    } catch (err) {
      console.error(err);
      let errMsg = err.message || 'Registrasi gagal. Cek koneksi Anda.';
      switch (err.code) {
        case 'auth/email-already-in-use': errMsg = 'Email sudah terdaftar. Silakan login.'; break;
        case 'auth/weak-password': errMsg = 'Password terlalu lemah (minimal 6 karakter).'; break;
        case 'auth/invalid-email': errMsg = 'Format email tidak valid.'; break;
        default: break;
      }
      toast.error(errMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-glow-top" />
      <div className="login-glow-bottom" />

      <div className="login-card">
        <div className="login-header">
          <h2>Daftar Akun</h2>
          <p>Buat akun baru untuk membeli source code</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="reg-name">Nama Lengkap <span style={{ color: '#ef4444' }}>*</span></label>
            <div className="password-input-wrapper">
              <input
                id="reg-name"
                type="text"
                placeholder="Masukkan nama lengkap Anda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
              <User size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              id="reg-email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password <span style={{ color: '#ef4444' }}>*</span></label>
            <div className="password-input-wrapper">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button type="button" className="toggle-password" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-referral">
              Kode Referral <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '0.8rem' }}>(opsional)</span>
            </label>
            <div className="password-input-wrapper">
              <input
                id="reg-referral"
                type="text"
                placeholder="Contoh: REF-ABCD1234"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                autoComplete="off"
                style={{ letterSpacing: referralCode ? '0.05em' : 'normal' }}
              />
              <Gift size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6366f1', pointerEvents: 'none' }} />
            </div>
            <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
              Punya kode referral? Masukkan di sini agar Anda dan teman Anda mendapatkan keuntungan.
            </small>
          </div>

          <div className="form-group" style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', marginBottom: '0.5rem' }}>
            <div 
              className="cf-turnstile" 
              data-sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAAAEMK0ikWTCNE94mo"} 
              data-callback="handleTurnstileSuccess"
              data-theme="dark"
            ></div>
          </div>

          <button type="submit" className="btn-login" disabled={loading || !turnstileToken}>
            {loading ? <><span className="btn-spinner" /> Mendaftar...</> : <><LogIn size={18} /> Daftar Sekarang</>}
          </button>
        </form>

        <p className="login-note">
          Sudah punya akun? <Link to="/login">Masuk di sini</Link>
        </p>
      </div>

      {/* ── Email Verification Modal ──────────────────── */}
      {showVerifyModal && (
        <div className="verify-overlay">
          <div className={`verify-card ${isVerified ? 'verify-card--success' : 'verify-card--waiting'}`}>

            {!isVerified && (
              <button className="verify-close" onClick={handleCloseModal} title="Tutup & login nanti">
                <X size={16} />
              </button>
            )}

            <div className={`verify-icon ${isVerified ? 'verify-icon--success' : 'verify-icon--waiting'}`}>
              {isVerified ? '✅' : '✉️'}
            </div>

            {isVerified ? (
              <>
                <h2 className="verify-title">Email Terverifikasi! 🎉</h2>
                <p className="verify-desc">
                  Selamat datang di <strong>FreeWithRidho</strong>! Akun Anda telah berhasil diverifikasi
                  dan kini aktif sepenuhnya. Anda siap menjelajahi ribuan source code premium pilihan kami.
                </p>
                <div className="verify-progress-wrap">
                  <div className="verify-progress-bar" />
                </div>
                <p className="verify-redirect-hint">⏳ Mengalihkan ke beranda dalam 3 detik...</p>
              </>
            ) : (
              <>
                <h2 className="verify-title">Verifikasi Email Anda ✉️</h2>
                <p className="verify-subtitle">Kami telah mengirimkan tautan verifikasi ke:</p>
                <div className="verify-email-chip">{email}</div>

                <div className="verify-spam-note">
                  <span className="verify-spam-icon">📁</span>
                  <span>
                    <strong>Tidak menemukan email?</strong> Periksa folder{' '}
                    <strong>Spam</strong>, <strong>Junk</strong>, atau <strong>Promosi</strong>{' '}
                    di kotak masuk Anda. Email verifikasi kadang tersaring secara otomatis.
                  </span>
                </div>

                <div className="verify-waiting">
                  <span className="verify-waiting-text">Menunggu verifikasi</span>
                  <span className="verify-dot" />
                  <span className="verify-dot" />
                  <span className="verify-dot" />
                </div>

                <button className="verify-btn-primary" onClick={() => window.open('https://mail.google.com', '_blank')}>
                  <Mail size={17} />
                  Buka Gmail
                  <ExternalLink size={14} />
                </button>

                <button type="button" className="verify-resend" onClick={handleResend} disabled={resendCooldown > 0}>
                  <RefreshCw size={13} />
                  {resendCooldown > 0 ? `Kirim Ulang (${resendCooldown}s)` : 'Kirim Ulang Email Verifikasi'}
                </button>

                <p className="verify-auto-hint">
                  Halaman akan otomatis terperbarui setelah Anda mengklik tautan di email.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;

