import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectById } from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, ArrowLeft, ShieldCheck } from 'lucide-react';
import './Checkout.css';

const Checkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchProject = async () => {
      try {
        const data = await getProjectById(id);
        if (!data) {
          setError('Proyek tidak ditemukan.');
        } else if (data.price <= 0) {
          navigate(`/project/${id}`); // If free, go back
        } else {
          setProject(data);
        }
      } catch (err) {
        setError('Gagal memuat detail proyek.');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id, user, navigate]);

  const handleCheckout = async () => {
    try {
      setProcessing(true);
      setError('');
      
      // Request ke Netlify Function (production) / Vite proxy (development)
      const endpoint = import.meta.env.PROD
        ? '/.netlify/functions/create-transaction'
        : '/api/create-transaction';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          userId: user.uid,
          userEmail: user.email,
          projectTitle: project.title,
          amount: project.price,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Gagal memproses pembayaran');
      }

      // Redirect user to Tripay checkout page
      window.location.href = data.checkoutUrl;
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat memproses pembayaran.');
      setProcessing(false);
    }
  };

  if (loading) return <div className="checkout-loading"><div className="spinner-large"></div></div>;
  if (error) return <div className="checkout-error">{error}</div>;
  if (!project) return null;

  return (
    <div className="checkout-page">
      <button onClick={() => navigate(-1)} className="back-btn">
        <ArrowLeft size={18} /> Kembali
      </button>

      <div className="checkout-container">
        <div className="checkout-header">
          <ShoppingBag size={32} className="checkout-icon" />
          <h1>Selesaikan Pembayaran</h1>
          <p>Anda akan membeli source code berikut.</p>
        </div>

        <div className="checkout-summary">
          <div className="summary-item">
            <span className="summary-label">Proyek</span>
            <span className="summary-value">{project.title}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Akun Pembeli</span>
            <span className="summary-value">{user.email}</span>
          </div>
          <div className="summary-item total">
            <span className="summary-label">Total Pembayaran</span>
            <span className="summary-value price">Rp {project.price.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="checkout-security">
          <ShieldCheck size={18} /> Pembayaran diproses dengan aman oleh Tripay.
        </div>

        <button 
          className="btn-pay" 
          onClick={handleCheckout} 
          disabled={processing}
        >
          {processing ? 'Memproses...' : 'Lanjutkan ke Pembayaran'}
        </button>
      </div>
    </div>
  );
};

export default Checkout;
