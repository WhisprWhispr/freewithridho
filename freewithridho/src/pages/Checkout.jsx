import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getProjectById } from '../services/projectService';
import { getSettings } from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, ArrowLeft, ShieldCheck, Loader2, Tag, X, RefreshCw, QrCode, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, limit } from 'firebase/firestore';
import { validatePromoCode } from '../services/promoService';
import { getProjectPrice } from '../utils/flashSaleHelper';
import './Checkout.css';

const Checkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [instanpayConfig, setInstanpayConfig] = useState(null);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  
  const [paymentMethod, setPaymentMethod] = useState('qris'); // 'qris' or 'crypto'

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [validPromo, setValidPromo] = useState(null);
  const [checkingPromo, setCheckingPromo] = useState(false);

  const [paymentDetails, setPaymentDetails] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  
  // Buyer input data state
  const [buyerInputData, setBuyerInputData] = useState('');

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedPackage = searchParams.get('pkg') || 'source_code';
  const domainExt = searchParams.get('ext') || '';
  const customDomain = searchParams.get('domain') || '';

  const getDynamicPrice = (proj) => {
    if (!proj) return 0;
    let base = getProjectPrice(proj) || 0;
    if (!proj.offersWebPackages || selectedPackage !== 'hosting_domain') return base;
    
    if (domainExt && proj.domainOptions) {
      const selectedOpt = proj.domainOptions.find(opt => opt.extension === domainExt);
      if (selectedOpt) {
        return base + (Number(selectedOpt.price) || 0);
      }
    }
    return base;
  };

  const basePrice = project ? getDynamicPrice(project) : 0;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [data, settings] = await Promise.all([
          getProjectById(id),
          getSettings('instanpay')
        ]);

        if (!data) {
          setError('Proyek tidak ditemukan.');
        } else if (!data.price || data.price <= 0) {
          navigate(`/project/${id}`); // gratis, balik ke detail
        } else {
          setProject(data);
        }

        if (settings && settings.apiKey) {
          setInstanpayConfig(settings);
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
          
          // If a payment was pending, and we get an update that it's success (though the query filters PENDING, 
          // let's say the webhook updates it to SETTLEMENT, the snapshot will be empty, redirecting logic below)
        } else {
          setPendingTransaction(null);
        }
      } else {
        setPendingTransaction(null);
      }
    });
    return () => unsubscribe();
  }, [user, id]);
  
  // Real-time listener for current transaction success
  useEffect(() => {
    if (!paymentDetails || !user) return;
    const q = query(
      collection(db, 'transactions'),
      where('merchantRef', '==', paymentDetails.merchantRef),
      limit(1)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const txData = snap.docs[0].data();
        if (txData.status === 'SETTLEMENT' || txData.status === 'SUCCESS' || txData.status === 'PAID') {
           toast.success('Pembayaran berhasil!');
           navigate(`/success?reference=${paymentDetails.merchantRef}&transaction_status=settlement`);
        }
      }
    });
    return () => unsubscribe();
  }, [paymentDetails, user, navigate]);

  // Countdown timer for QRIS
  useEffect(() => {
    if (!paymentDetails || !paymentDetails.expiredAt) return;
    
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      // Handle both date object or ISO string from backend
      const expirationTime = new Date(paymentDetails.expiredAt).getTime();
      const difference = expirationTime - now;

      if (difference > 0) {
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        // format with leading zero
        const mStr = minutes.toString().padStart(2, '0');
        const sStr = seconds.toString().padStart(2, '0');
        setTimeLeft(`${mStr}:${sStr}`);
      } else {
        setTimeLeft('Kedaluwarsa');
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [paymentDetails]);

  const handleCheckout = async () => {
    if (project?.requiresInputData && !buyerInputData.trim()) {
      toast.error(`Mohon isi ${project.inputDataLabel || 'data yang dibutuhkan'} terlebih dahulu.`);
      return;
    }
    
    const loadingToast = toast.loading('Memproses pembayaran...');
    try {
      setProcessing(true);

      const endpoint = '/.netlify/functions/create-transaction';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          userId: user.uid,
          userEmail: user.email,
          projectTitle: project.title + (selectedPackage === 'hosting_domain' ? ` (Hosting & Domain: ${customDomain}${domainExt})` : ''),
          amount: validPromo ? validPromo.finalAmount : basePrice,
          paymentMethod: paymentMethod, // 'qris' or 'crypto'
          chain: 'BSC',
          token: 'USDT'
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response dari server:', text);
        throw new Error(
          response.status === 404
            ? 'Function tidak ditemukan. Jalankan server dengan: netlify dev'
            : `Server error (${response.status}): ${text.substring(0, 100)}`
        );
      }
      
      if (!response.ok) {
        throw new Error(data.message || 'Gagal memproses pembayaran');
      }

      if (paymentMethod === 'crypto') {
        toast.success('Pesanan Crypto Berhasil Dibuat!', { id: loadingToast });
        
        try {
          await addDoc(collection(db, 'transactions'), {
            merchantRef: data.reference,
            gatewayOrderId: data.gatewayOrderId,
            projectId: id,
            projectTitle: project.title,
            userId: user.uid,
            userEmail: user.email,
            amount: validPromo ? validPromo.finalAmount : basePrice,
            originalAmount: basePrice,
            amountUsd: data.amount_usd,
            promoCode: validPromo ? validPromo.code : null,
            status: 'PENDING',
            createdAt: serverTimestamp(),
            expiredAt: data.expiredAt,
            buyerInputData: project?.requiresInputData ? buyerInputData.trim() : null,
            packageType: selectedPackage,
            domainExtension: domainExt,
            customDomainName: customDomain,
            paymentMethod: 'crypto',
            depositAddress: data.deposit_address,
            paymentUrl: data.payment_url,
          });
        } catch (e) {
          console.warn('Gagal menyimpan transaksi PENDING crypto:', e);
        }

        setProcessing(false);
        // Redirect to Instanpay Crypto Payment URL
        window.location.href = data.payment_url;
        return;
      }

      toast.success('Kode QRIS berhasil dibuat!', { id: loadingToast });
      
      try {
        await addDoc(collection(db, 'transactions'), {
          merchantRef: data.merchantRef,
          projectId: id,
          projectTitle: project.title,
          userId: user.uid,
          userEmail: user.email,
          amount: validPromo ? validPromo.finalAmount : basePrice,
          originalAmount: basePrice,
          promoCode: validPromo ? validPromo.code : null,
          status: 'PENDING',
          createdAt: serverTimestamp(),
          qrCodeSvg: data.qrCodeSvg,
          qrisString: data.qrisString,
          expiredAt: data.expiredAt,
          buyerInputData: project?.requiresInputData ? buyerInputData.trim() : null,
          packageType: selectedPackage,
          domainExtension: domainExt,
          customDomainName: customDomain,
        });
      } catch (e) {
        console.warn('Gagal menyimpan transaksi PENDING:', e);
      }

      setPaymentDetails(data);
      setProcessing(false);

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Terjadi kesalahan saat memproses pembayaran.', { id: loadingToast });
      setProcessing(false);
    }
  };

  const handleResumePendingPayment = () => {
    if (!pendingTransaction?.qrCodeSvg) {
      toast.error('Kode QR tidak ditemukan. Silakan buat transaksi baru.');
      return;
    }
    setPaymentDetails({
      qrCodeSvg: pendingTransaction.qrCodeSvg,
      qrisString: pendingTransaction.qrisString,
      merchantRef: pendingTransaction.merchantRef,
      expiredAt: pendingTransaction.expiredAt || null,
      totalFormatted: `Rp ${pendingTransaction.amount.toLocaleString('id-ID')}`
    });
  };

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setCheckingPromo(true);
    
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

  const handleDownloadQR = () => {
    if (!paymentDetails?.qrCodeSvg) return;
    const svgBlob = new Blob([paymentDetails.qrCodeSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QRIS-${paymentDetails.merchantRef}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <span>Produk</span>
            <span className="summary-value">
              {project.title}
              {project.offersWebPackages && selectedPackage === 'hosting_domain' && (
                <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px' }}>
                  + Hosting & Domain ({customDomain}{domainExt})
                </div>
              )}
            </span>
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
                disabled={validPromo !== null || checkingPromo || paymentDetails !== null}
                className="promo-input"
              />
              {!validPromo ? (
                <button
                  className="btn-apply-promo"
                  onClick={handleApplyPromo}
                  disabled={!promoCodeInput.trim() || checkingPromo || paymentDetails !== null}
                >
                  {checkingPromo ? 'Cek...' : 'Terapkan'}
                </button>
              ) : (
                <button className="btn-remove-promo" onClick={handleRemovePromo} title="Hapus Promo" disabled={paymentDetails !== null}>
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

          {basePrice < project.price ? (
            <div className="summary-item">
              <span className="summary-label">Harga Diskon</span>
              <span className="summary-value price">Rp {basePrice.toLocaleString('id-ID')}</span>
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
              {paymentDetails?.totalFormatted || `Rp ${(validPromo ? validPromo.finalAmount : basePrice).toLocaleString('id-ID')}`}
            </span>
          </div>
        </div>

        {/* Payment Method Selection for Admin Items */}
        {project?.developerName === 'Admin' && !paymentDetails && (
          <div className="payment-method-section" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#f8fafc', marginBottom: '1rem' }}>Pilih Metode Pembayaran</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${paymentMethod === 'qris' ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`, background: paymentMethod === 'qris' ? 'rgba(139,92,246,0.1)' : 'transparent', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input type="radio" name="paymentMethod" checked={paymentMethod === 'qris'} onChange={() => setPaymentMethod('qris')} style={{ margin: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: paymentMethod === 'qris' ? '#fff' : '#cbd5e1', fontWeight: 600 }}>QRIS (Otomatis)</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Verifikasi instan via Instanpay</span>
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${paymentMethod === 'crypto' ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`, background: paymentMethod === 'crypto' ? 'rgba(139,92,246,0.1)' : 'transparent', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input type="radio" name="paymentMethod" checked={paymentMethod === 'crypto'} onChange={() => setPaymentMethod('crypto')} style={{ margin: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: paymentMethod === 'crypto' ? '#fff' : '#cbd5e1', fontWeight: 600 }}>Crypto Wallet (Manual)</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Transfer via USDT / Aset Digital lain</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        <div className="checkout-security">
          <ShieldCheck size={18} /> Pembayaran diproses dengan aman oleh Instanpay.
        </div>

        {!instanpayConfig?.apiKey && (
          <div className="checkout-warning">
            ⚠️ Konfigurasi Instanpay belum diatur. Admin harus mengisi API Key terlebih dahulu di Admin Panel → Settings.
          </div>
        )}

        {!paymentDetails ? (
          <div className="checkout-pay-section">
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
            
            {project?.requiresInputData && (
              <div className="checkout-input-section" style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.2)', marginBottom: '1.5rem', marginTop: '1.5rem' }}>
                <label style={{ display: 'block', color: '#818cf8', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                  {project.inputDataLabel || 'Data Pesanan'} *
                </label>
                <input
                  type="text"
                  placeholder={`Masukkan ${project.inputDataLabel || 'data'}`}
                  value={buyerInputData}
                  onChange={(e) => setBuyerInputData(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
                />
              </div>
            )}

            <button
              className="btn-pay"
              onClick={handleCheckout}
              disabled={processing || (paymentMethod === 'qris' && !instanpayConfig?.apiKey)}
            >
              {processing ? (
                <><Loader2 size={18} className="spin-icon" /> Memproses...</>
              ) : (
                <>Lanjut Pembayaran {paymentMethod === 'crypto' ? 'Crypto' : 'QRIS'}</>
              )}
            </button>
          </div>
        ) : (
          <div className="qris-container" style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px', marginTop: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ marginBottom: '1rem', color: '#fff' }}><QrCode style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }}/> Scan QRIS untuk Membayar</h3>
            <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Buka aplikasi e-wallet atau m-banking Anda dan scan kode di bawah ini.</p>
            
            {paymentDetails.expiredAt && (
              <div style={{ color: timeLeft === 'Kedaluwarsa' ? '#ef4444' : '#f59e0b', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '1.5rem', background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px', display: 'inline-block' }}>
                ⏳ Sisa Waktu: {timeLeft}
              </div>
            )}
            
            <div 
              style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1.5rem', maxWidth: '300px', width: '100%' }}
              dangerouslySetInnerHTML={{ __html: paymentDetails.qrCodeSvg.replace('<svg ', '<svg style="width: 100%; height: auto;" ') }}
            />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                onClick={handleDownloadQR}
                className="btn-apply-promo" 
                style={{ padding: '0.75rem 1.5rem', width: 'auto', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}
              >
                Unduh QR Code
              </button>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '1rem' }}>
                Menunggu pembayaran... Halaman akan otomatis beralih jika pembayaran berhasil.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
