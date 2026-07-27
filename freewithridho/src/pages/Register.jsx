import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Code2, LogIn, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './Login.css';

const Register = () => {
  const { register, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    if (!email || !password) {
      toast.error('Email dan password wajib diisi.');
      return;
    }
    
    const toastId = toast.loading('Sedang mendaftar...');
    try {
      setLoading(true);
      await register(email, password);
      
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'ridhosandhika18022022@gmail.com';
      if (email === adminEmail) {
        toast.success('Registrasi Admin berhasil!', { id: toastId });
        navigate('/admin');
      } else {
        toast.success('Registrasi berhasil!', { id: toastId });
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      let errMsg = 'Registrasi gagal. Cek koneksi Anda.';
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
          <div className="login-logo-icon">
            <Code2 size={28} />
          </div>
          <h2>Daftar Akun</h2>
          <p>Buat akun baru untuk membeli source code</p>
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
