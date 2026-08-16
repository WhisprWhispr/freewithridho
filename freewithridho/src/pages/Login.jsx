import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Code2, LogIn, Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import './Login.css';

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lupa Password state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetting, setResetting] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get('redirect');
      if (redirect) {
        navigate(redirect);
        return;
      }

      const adminEmail = 'ridhosandhika18022022@gmail.com';
      if (user.email === adminEmail) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Harap isi email dan password!');
      return;
    }
    
    const toastId = toast.loading('Memproses login...');
    try {
      setLoading(true);
      await login(email, password);
      
      const adminEmail = 'ridhosandhika18022022@gmail.com';
      if (email === adminEmail) {
        toast.success('Login Admin berhasil!', { id: toastId });
        navigate('/admin');
      } else {
        toast.success('Login berhasil!', { id: toastId });
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      let errMsg = 'Login gagal. Cek koneksi Anda.';
      // Tampilkan pesan custom (misal: email belum verifikasi, akun diblokir)
      if (err.message && !err.code) {
        errMsg = err.message;
      } else {
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
            errMsg = 'Email atau password salah.';
            break;
          case 'auth/invalid-email':
            errMsg = 'Format email tidak valid.';
            break;
          case 'auth/too-many-requests':
            errMsg = 'Terlalu banyak percobaan login. Coba lagi beberapa saat.';
            break;
        }
      }
      toast.error(errMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Harap masukkan email Anda.');
      return;
    }
    
    const toastId = toast.loading('Mengirim link reset password...');
    try {
      setResetting(true);
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success('Link reset password telah dikirim ke email Anda!', { id: toastId });
      setShowResetModal(false);
      setResetEmail('');
    } catch (error) {
      console.error('Reset Password Error:', error);
      let errMsg = 'Gagal mengirim link reset. Cek email Anda.';
      if (error.code === 'auth/user-not-found') errMsg = 'Email tidak terdaftar.';
      else if (error.code === 'auth/invalid-email') errMsg = 'Format email salah.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-glow-top"></div>
      <div className="login-glow-bottom"></div>

      <div className="login-card">
        <div className="login-header">
          <h2>Selamat Datang</h2>
          <p>Silakan login ke akun Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
            <button 
              type="button" 
              onClick={() => setShowResetModal(true)} 
              style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
            >
              Lupa password?
            </button>
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <><span className="btn-spinner"></span> Masuk...</>
            ) : (
              <><LogIn size={18} /> Masuk</>
            )}
          </button>
        </form>

        <p className="login-note">
          Belum punya akun? <Link to="/register">Daftar sekarang</Link>
        </p>
      </div>

      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button onClick={() => !resetting && setShowResetModal(false)} className="close-btn" disabled={resetting}><X size={20}/></button>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
              Masukkan alamat email yang terdaftar. Kami akan mengirimkan tautan untuk mereset password Anda.
            </p>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>Email Anda</label>
                <input 
                  type="email" 
                  value={resetEmail} 
                  onChange={(e) => setResetEmail(e.target.value)} 
                  placeholder="nama@email.com" 
                  required 
                  autoFocus
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.75rem', borderRadius: '8px', width: '100%' }}
                />
              </div>
              <button type="submit" className="btn-login" disabled={resetting} style={{ marginTop: '1.5rem' }}>
                {resetting ? 'Mengirim...' : 'Kirim Tautan Reset'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
