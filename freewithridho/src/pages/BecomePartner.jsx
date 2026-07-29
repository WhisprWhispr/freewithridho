import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { submitPartnerApplication } from '../services/partnerService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Briefcase, Mail, User, Phone, Link2, FileText, Send, CheckCircle, Download, AlertCircle, PenTool } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generatePartnerPDF } from '../utils/pdfGenerator';
import './BecomePartner.css';

// ── Native HTML5 Canvas Signature Pad (no external library) ──────────────────
const SignaturePad = ({ canvasRef, onHasSignature }) => {
  const isDrawing = useRef(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  }, [canvasRef]);

  const draw = useCallback((e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    onHasSignature && onHasSignature(true);
  }, [canvasRef, onHasSignature]);

  const stopDraw = useCallback((e) => {
    e.preventDefault();
    isDrawing.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // mouse
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    // touch
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDraw);
      canvas.removeEventListener('mouseleave', stopDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDraw);
    };
  }, [canvasRef, startDraw, draw, stopDraw]);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={150}
      style={{ width: '100%', height: '150px', display: 'block', cursor: 'crosshair', borderRadius: '8px' }}
    />
  );
};

// ── Main BecomePartner Page ───────────────────────────────────────────────────
const BecomePartner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    portfolio: '',
    skills: '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const sigCanvasRef = useRef(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureData, setSignatureData] = useState(null);

  // Auto-fill email if logged in
  useEffect(() => {
    if (user && user.email) {
      setForm(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const getCompressedSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return null;
    // Compress: draw onto a smaller canvas as JPEG
    const out = document.createElement('canvas');
    out.width = 300;
    out.height = 100;
    const ctx = out.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 300, 100);
    ctx.drawImage(canvas, 0, 0, 300, 100);
    return out.toDataURL('image/jpeg', 0.5);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Anda harus login terlebih dahulu.');
      return;
    }

    if (!form.fullName || !form.email || !form.phone || !form.portfolio) {
      toast.error('Mohon lengkapi data yang wajib diisi.');
      return;
    }

    if (!hasSignature) {
      toast.error('Mohon masukkan tanda tangan Anda.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const applicantSignatureBase64 = getCompressedSignature();
      setSignatureData(applicantSignatureBase64);

      // Cek banned
      const qPhone = query(collection(db, 'banned_users'), where('phone', '==', form.phone));
      const phoneSnap = await getDocs(qPhone);
      if (!phoneSnap.empty) {
        toast.error('Pendaftaran ditolak! Nomor telepon ini telah diblokir dari sistem kami.');
        setIsSubmitting(false);
        return;
      }

      await submitPartnerApplication({
        ...form,
        applicantSignature: applicantSignatureBase64,
        userId: user.uid,
        balance: 0,
      });
      setIsSuccess(true);
      toast.success('Pendaftaran berhasil dikirim!');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error(`Gagal mengirim: ${error?.message || 'Silakan coba lagi.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    generatePartnerPDF({
      ...form,
      status: 'pending',
      applicantSignature: signatureData
    });
  };

  if (isSuccess) {
    return (
      <div className="partner-page success-view">
        <div className="partner-success-card">
          <CheckCircle size={64} className="success-icon" />
          <h2>Pendaftaran Berhasil!</h2>
          <p>Terima kasih telah mendaftar sebagai Partner Developer. Tim kami akan meninjau pendaftaran Anda dan menghubungi Anda melalui email atau WhatsApp.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            <button className="btn btn-secondary" onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Download size={18} /> Unduh Bukti PDF
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="partner-page">
      <div className="partner-header">
        <h1>Bergabung Sebagai <span className="text-gradient">Partner Developer</span></h1>
        <p>Jual karya source code Anda (premium atau gratis) ke ribuan pengguna kami dan dapatkan penghasilan.</p>
      </div>

      <div className="partner-content">
        <div className="partner-benefits">
          <h3>Mengapa Bergabung?</h3>
          <ul>
            <li>
              <div className="benefit-icon">💰</div>
              <div>
                <strong>Penghasilan Tambahan</strong>
                <p>Jual source code premium Anda dan dapatkan profit maksimal.</p>
              </div>
            </li>
            <li>
              <div className="benefit-icon">🌍</div>
              <div>
                <strong>Jangkauan Luas</strong>
                <p>Proyek Anda akan dilihat oleh ribuan pengembang dari seluruh dunia.</p>
              </div>
            </li>
            <li>
              <div className="benefit-icon">🛡️</div>
              <div>
                <strong>Aman & Terpercaya</strong>
                <p>Sistem transaksi terjamin aman dengan integrasi Midtrans.</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="partner-form-container">
          {!user && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <AlertCircle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#ef4444', display: 'block', marginBottom: '0.25rem' }}>Anda belum login!</strong>
                <p style={{ color: '#f8fafc', margin: 0, fontSize: '0.9rem' }}>Silakan login atau daftar akun terlebih dahulu agar kami bisa menautkan pendaftaran ini ke akun Anda.</p>
                <button className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.5rem 1rem' }} onClick={() => navigate('/login?redirect=/become-partner')}>Login Sekarang</button>
              </div>
            </div>
          )}

          <form className="partner-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label><User size={16} /> Nama Lengkap *</label>
              <input type="text" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Contoh: Budi Santoso" required />
            </div>
            
            <div className="form-group">
              <label><Mail size={16} /> Email Aktif *</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="budi@example.com" required />
            </div>

            <div className="form-group">
              <label><Phone size={16} /> Nomor WhatsApp *</label>
              <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="Contoh: 081234567890" required />
            </div>

            <div className="form-group">
              <label><Link2 size={16} /> Link Portofolio / GitHub *</label>
              <input type="url" name="portfolio" value={form.portfolio} onChange={handleChange} placeholder="https://github.com/username" required />
            </div>

            <div className="form-group">
              <label><Briefcase size={16} /> Keahlian (Tech Stack)</label>
              <input type="text" name="skills" value={form.skills} onChange={handleChange} placeholder="Contoh: React, Node.js, Flutter" />
            </div>

            <div className="form-group">
              <label><FileText size={16} /> Kenapa Anda ingin bergabung?</label>
              <textarea name="reason" value={form.reason} onChange={handleChange} rows="3" placeholder="Ceritakan sedikit tentang motivasi Anda..."></textarea>
            </div>

            {/* ── Tanda Tangan Native Canvas ── */}
            <div className="form-group">
              <label>
                <PenTool size={16} /> Tanda Tangan Digital *
              </label>
              <div style={{
                border: hasSignature ? '2px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                background: 'white',
                overflow: 'hidden',
                transition: 'border-color 0.3s'
              }}>
                <SignaturePad canvasRef={sigCanvasRef} onHasSignature={setHasSignature} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: hasSignature ? '#6ee7b7' : '#94a3b8' }}>
                  {hasSignature ? '✅ Tanda tangan terisi' : 'Gunakan mouse atau jari Anda untuk tanda tangan'}
                </span>
                <button type="button" onClick={clearSignature} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}>Hapus</button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary submit-btn"
              disabled={isSubmitting || !hasSignature}
            >
              {isSubmitting ? 'Mengirim...' : <><Send size={18} /> Kirim Pendaftaran</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BecomePartner;
