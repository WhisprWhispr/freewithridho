import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProjectById } from '../services/projectService';
import { getSettings } from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, ArrowLeft, ShieldCheck, Loader2, Tag, X, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, onSnapshot, limit } from 'firebase/firestore';
import { validatePromoCode } from '../services/promoService';
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
  const [showSnap, setShowSnap] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null); // existing PENDING trx

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [validPromo, setValidPromo] = useState(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

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

  // Real-time listener: cek apakah ada transaksi PENDING yang belum selesai untuk proyek ini
  useEffect(() => {
    if (!user || !id) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      where('projectId', '==', id),
      where('status', '==', 'PENDING'),
      limit(1)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const doc = snap.docs[0];
        const txData = doc.data();
        
        let isExpired = false;
        if (txData.createdAt) {
          const txTime = typeof txData.createdAt.toMillis === 'function' 
            ? txData.createdAt.toMillis() 
            : (txData.createdAt.seconds ? txData.createdAt.seconds * 1000 : new Date(txData.createdAt).getTime());
          
          if (Date.now() - txTime > 24 * 60 * 60 * 1000) {
            isExpired = true;
          }
        }
        
        if (!isExpired) {
          setPendingTransaction({ id: doc.id, ...txData });
        } else {
          setPendingTransaction(null);
        }
      } else {
        setPendingTransaction(null);
      }
    });
    return () => unsubscribe();
  }, [user, id]);

  const handleCheckout = async () => {
    const loadingToast = toast.loading('Memproses pembayaran...');
    try {
      setProcessing(true);

      // Request ke API lokal (Express Server)
      const endpoint = '/api/create-transaction';

      const basePrice = (project.discountPrice && project.discountPrice > 0) ? Number(project.discountPrice) : Number(project.price);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          userId: user.uid,
          userEmail: user.email,
          projectTitle: project.title,
          amount: validPromo ? validPromo.finalAmount : basePrice,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Gagal memproses pembayaran');
      }

      toast.success('Membuka gerbang pembayaran...', { id: loadingToast });
      
      // Simpan transaksi sebagai PENDING di Firestore
      try {
        await addDoc(collection(db, 'transactions'), {
          merchantRef: data.merchantRef,
          snapToken: data.reference || null,
          projectId: id,
          projectTitle: project.title,
          userId: user.uid,
          userEmail: user.email,
          amount: validPromo ? validPromo.finalAmount : basePrice,
          originalAmount: basePrice,
          promoCode: validPromo ? validPromo.code : null,
          status: 'PENDING',
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Gagal menyimpan transaksi PENDING:', e);
      }

      // Buka popup Midtrans Snap ter-embed
      openSnapEmbed(data.reference, data.merchantRef);

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Terjadi kesalahan saat memproses pembayaran.', { id: loadingToast });
      setProcessing(false);
    }
  };

  // Lanjutkan bayar dari transaksi PENDING yang sudah ada
  const handleResumePendingPayment = () => {
    if (!pendingTransaction?.snapToken) {
      toast.error('Token pembayaran tidak ditemukan. Silakan buat transaksi baru.');
      return;
    }
    openSnapEmbed(pendingTransaction.snapToken, pendingTransaction.merchantRef);
  };

  // Buka Midtrans Snap embed
  const openSnapEmbed = (snapToken, merchantRef) => {
    setShowSnap(true);
    setTimeout(() => {
      window.snap.embed(snapToken, {
        embedId: 'snap-container',
        onSuccess: function (result) {
          toast.success('Pembayaran berhasil!');
          navigate(`/success?reference=${merchantRef}&transaction_status=settlement`);
        },
        onPending: function (result) {
          toast.info('Menunggu pembayaran Anda...');
          navigate(`/success?reference=${merchantRef}&transaction_status=pending`);
        },
        onError: function (result) {
          toast.error('Pembayaran gagal.');
          setProcessing(false);
          setShowSnap(false);
        },
        onClose: function () {
          // Jangan batalkan transaksi — biarkan PENDING agar user bisa kembali lagi
          toast('Pembayaran ditutup. Anda bisa melanjutkan kapan saja.', { icon: '⏸️' });
          setProcessing(false);
          setShowSnap(false);
        }
      });
    }, 100);
  };

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setCheckingPromo(true);
    const basePrice = (project.discountPrice && project.discountPrice > 0) ? Number(project.discountPrice) : Number(project.price);
    const result = await validatePromoCode(promoCodeInput, basePrice);
    
    if (result.valid) {
      setValidPromo(result);
      toast.success(result.message);
    } else {
      setValidPromo(null);
      toast.error(result.message);
    }
    setCheckingPromo(false);
  };

  const handleRemovePromo = () => {
    setValidPromo(null);
    setPromoCodeInput('');
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
          
          <div className="promo-section">
            <div className="promo-input-group">
              <Tag size={16} className="promo-icon" />
              <input
                type="text"
                placeholder="Punya kode promo?"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                disabled={validPromo !== null || checkingPromo}
                className="promo-input"
              />
              {!validPromo ? (
                <button
                  className="btn-apply-promo"
                  onClick={handleApplyPromo}
                  disabled={!promoCodeInput.trim() || checkingPromo}
                >
                  {checkingPromo ? 'Cek...' : 'Terapkan'}
                </button>
              ) : (
                <button className="btn-remove-promo" onClick={handleRemovePromo} title="Hapus Promo">
                  <X size={16} />
                </button>
              )}
            </div>
          {validPromo && (
            <div className="promo-success-msg">
              {validPromo.message}
            </div>
          )}
        </div>

          {project.discountPrice && project.discountPrice > 0 ? (
            <div className="summary-item">
              <span className="summary-label">Harga Diskon</span>
              <span className="summary-value price">Rp {project.discountPrice.toLocaleString('id-ID')}</span>
            </div>
          ) : (
            <div className="summary-item">
              <span className="summary-label">Harga Normal</span>
              <span className="summary-value price">Rp {project.price.toLocaleString('id-ID')}</span>
            </div>
          )}
          {validPromo && (
            <div className="summary-item discount">
              <span className="summary-label">Diskon ({validPromo.code})</span>
              <span className="summary-value price discount-val">- Rp {validPromo.discountAmount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="summary-item total">
            <span className="summary-label">Total Pembayaran</span>
            <span className="summary-value price final-price">
              Rp {(validPromo ? validPromo.finalAmount : ((project.discountPrice && project.discountPrice > 0) ? project.discountPrice : project.price)).toLocaleString('id-ID')}
            </span>
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

        {!showSnap ? (
          <div className="checkout-pay-section">
            {/* Jika ada PENDING transaction yang belum selesai, tampilkan tombol Lanjutkan Bayar */}
            {pendingTransaction && (
              <div className="pending-trx-notice">
                <p>⏸️ Anda memiliki pembayaran yang belum selesai untuk proyek ini.</p>
                <button
                  className="btn-resume-pay"
                  onClick={handleResumePendingPayment}
                  disabled={processing}
                >
                  <RefreshCw size={16} /> Lanjutkan Pembayaran
                </button>
                <div className="pending-trx-divider">— atau buat transaksi baru —</div>
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
        ) : (
          <div id="snap-container" className="snap-embed-container"></div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
