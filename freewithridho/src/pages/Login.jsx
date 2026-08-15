import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Code2, LogIn, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './Login.css';

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get('redirect');
      if (redirect) {
        navigate(redirect);
        return;
      }

      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'supportfreewithridho@gmail.com';
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
      
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'supportfreewithridho@gmail.com';
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
    </div>
  );
};

export default Login;
