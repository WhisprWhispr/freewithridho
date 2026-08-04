import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, LogIn, Eye, EyeOff, Gift } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { saveReferredBy, ensureReferralCode } from '../services/referralService';
import './Login.css';

const Register = () => {
  const { register, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'ridhosandhika18022022@gmail.com';
      if (user.email === adminEmail) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Nama lengkap wajib diisi.');
      return;
    }
    if (!email || !password) {
      toast.error('Email dan password wajib diisi.');
      return;
    }

    const toastId = toast.loading('Sedang mendaftar...');
    try {
      setLoading(true);
      const userCredential = await register(email, password, name.trim());
      const uid = userCredential.user.uid;

      // Ensure referral code is created for the new user
      await ensureReferralCode(uid);

      // Apply referral code if provided
      if (referralCode.trim()) {
        const result = await saveReferredBy(uid, referralCode.trim());
        if (result.valid) {
          toast.success(`✅ Kode referral berhasil dipakai dari: ${result.ownerName || 'Pengguna'}`, { duration: 4000 });
        } else {
          toast.error(`⚠️ Kode referral tidak valid: ${result.message}`, { duration: 4000 });
        }
      }

      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'ridhosandhika18022022@gmail.com';
      if (email === adminEmail) {
        toast.success('Registrasi Admin berhasil!', { id: toastId });
        navigate('/admin');
      } else {
        toast.success(`Selamat datang, ${name.trim()}! 🎉`, { id: toastId });
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      let errMsg = err.message || 'Registrasi gagal. Cek koneksi Anda.';
      switch (err.code) {
        case 'auth/email-already-in-use':
          errMsg = 'Email sudah terdaftar. Silakan login.';
          break;
        case 'auth/weak-password':
          errMsg = 'Password terlalu lemah (minimal 6 karakter).';
          break;
        case 'auth/invalid-email':
          errMsg = 'Format email tidak valid.';
          break;
        default:
          break;
      }
      toast.error(errMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-glow-top"></div>
      <div className="login-glow-bottom"></div>

      <div className="login-card">
        <div className="login-header">
          <h2>Daftar Akun</h2>
          <p>Buat akun baru untuk membeli source code</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Name Field */}
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

          {/* Email Field */}
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

          {/* Password Field */}
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
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Referral Code Field */}
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
Punya kode referral? Masukkan di sini agar Anda dan teman Anda sama-sama mendapatkan keuntungan.
            </small>
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <><span className="btn-spinner"></span> Mendaftar...</>
            ) : (
              <><LogIn size={18} /> Daftar Sekarang</>
            )}
          </button>
        </form>

        <p className="login-note">
          Sudah punya akun? <Link to="/login">Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
