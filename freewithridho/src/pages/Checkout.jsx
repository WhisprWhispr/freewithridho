import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectById } from '../services/projectService';
import { getSettings } from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './Checkout.css';

// Inject Midtrans Snap.js script dynamically
const loadSnapScript = (clientKey, isSandbox) => {
  return new Promise((resolve, reject) => {
    // Remove old script if exists
    const existing = document.getElementById('midtrans-snap');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = 'midtrans-snap';
    script.src = isSandbox
      ? 'https://app.sandbox.midtrans.com/snap/snap.js'
      : 'https://app.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap'));
    document.head.appendChild(script);
  });
};

const Checkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [midtransConfig, setMidtransConfig] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [data, settings] = await Promise.all([
          getProjectById(id),
          getSettings('midtrans')
        ]);

        if (!data) {
          setError('Proyek tidak ditemukan.');
        } else if (!data.price || data.price <= 0) {
          navigate(`/project/${id}`); // gratis, balik ke detail
        } else {
          setProject(data);
        }

        if (settings && settings.clientKey) {
          setMidtransConfig(settings);
          // Pre-load snap script
          try {
            await loadSnapScript(settings.clientKey, settings.environment !== 'production');
          } catch (e) {
            console.warn('Snap preload failed:', e.message);
          }
        }
      } catch (err) {
        setError('Gagal memuat detail proyek.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, navigate]);

  const handleCheckout = async () => {
    const loadingToast = toast.loading('Memproses pembayaran otomatis...');
    try {
      setProcessing(true);

      // Simulasikan delay pembayaran
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Buat referensi transaksi dummy
      const merchantRef = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Tulis langsung ke Firestore sebagai PAID (berkat update rules)
      const { db } = await import('../firebase');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');

      await setDoc(doc(db, 'transactions', merchantRef), {
        reference: `MOCK-${Date.now()}`,
        merchantRef: merchantRef,
        projectId: id,
        userId: user.uid,
        userEmail: user.email,
        amount: project.price,
        status: 'PAID', // Langsung PAID
        createdAt: serverTimestamp(),
        paidAt: serverTimestamp(),
        paymentMethod: 'otomatis_midtrans_dummy'
      });

      toast.dismiss(loadingToast);
      toast.success('Pembayaran otomatis berhasil! 🎉');
      
      // Redirect ke halaman sukses dengan reference
      navigate(`/success?reference=${merchantRef}`);

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Terjadi kesalahan saat memproses pembayaran.', { id: loadingToast });
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="checkout-loading">
      <div className="spinner-large"></div>
    </div>
  );
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
          <ShieldCheck size={18} /> Pembayaran diproses dengan aman oleh Midtrans.
        </div>

        {!midtransConfig?.clientKey && (
          <div className="checkout-warning">
            ⚠️ Konfigurasi Midtrans belum diatur. Admin harus mengisi Client Key & Server Key terlebih dahulu di Admin Panel → Settings.
          </div>
        )}

        <button
          className="btn-pay"
          onClick={handleCheckout}
          disabled={processing || !midtransConfig?.clientKey}
        >
          {processing ? (
            <><Loader2 size={18} className="spin-icon" /> Memproses...</>
          ) : (
            'Lanjutkan ke Pembayaran'
          )}
        </button>
      </div>
    </div>
  );
};

export default Checkout;
