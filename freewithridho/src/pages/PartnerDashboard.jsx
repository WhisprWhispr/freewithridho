import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToPartnerByUserId, submitWithdrawal } from '../services/partnerService';
import { listenToProjects, addProject, deleteProject, updateProject } from '../services/projectService';
import { toast } from 'react-hot-toast';
import { DollarSign, Upload, Trash2, Edit2, Wallet, Clock, CheckCircle, BarChart2, BookOpen, Users } from 'lucide-react';
import PartnerBadge, { getBadgeTier } from '../components/PartnerBadge';
import SalesAnalytics from '../components/SalesAnalytics';
import WelcomeModal from '../components/WelcomeModal';
import './PartnerDashboard.css';

const CATEGORIES = ['Basic', 'Premium', 'Web', 'Game', 'Mobile'];

const emptyForm = {
  title: '',
  category: 'Basic',
  description: '',
  downloadUrl: '',
  images: [''],
  price: 0,
  demoUrl: '',
  isFlashSale: false,
  discountPrice: 0,
};

const PartnerDashboard = () => {
  const { user } = useAuth();
  const [partner, setPartner] = useState(null);
  const [projects, setProjects] = useState([]);
  const [partnerWithdrawals, setPartnerWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'withdraw'

  // Form states
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Withdraw states
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  // Welcome modal state
  const [showWelcome, setShowWelcome] = useState(true);

  // Affiliate (referral) real-time state
  const [affiliateData, setAffiliateData] = useState({ code: '', balance: 0, count: 0, partnerAffiliateBalance: 0, partnerAffiliateCount: 0 });
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribePartner = listenToPartnerByUserId(user.uid, (data) => {
      setPartner(data);
      setLoading(false);
      if (data) {
        setAffiliateData(prev => ({
          ...prev,
          partnerAffiliateBalance: data.affiliateBalance || 0,
          partnerAffiliateCount: data.affiliateCount || 0,
        }));
        // Load withdrawals once we have partner id
        import('../services/partnerService').then(({ listenToWithdrawals }) => {
          listenToWithdrawals((allWithdrawals) => {
            const myWithdrawals = allWithdrawals.filter(w => w.partnerId === data.id);
            setPartnerWithdrawals(myWithdrawals);
          });
        });
      }
    });

    const unsubscribeProjects = listenToProjects((allProjects) => {
      const myProjects = allProjects.filter(p => p.ownerId === user.uid);
      setProjects(myProjects);
    });

    let unsubscribeProfile;
    import('../services/referralService').then(({ listenToUserProfile, ensureReferralCode }) => {
      ensureReferralCode(user.uid);
      unsubscribeProfile = listenToUserProfile(user.uid, (profile) => {
        if (profile) {
          setAffiliateData(prev => ({
            ...prev,
            code: profile.referralCode || '',
            balance: profile.referralBalance || 0,
            count: profile.referralCount || 0,
          }));
        }
      });
    });

    return () => {
      if (unsubscribePartner) unsubscribePartner();
      if (unsubscribeProjects) unsubscribeProjects();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [user?.uid]);

  if (loading) {
    return <div className="partner-loading">Memuat Dashboard...</div>;
  }

  if (!partner) {
    return (
      <div className="partner-access-denied">
        <h2>Akses Ditolak</h2>
        <p>Anda belum menjadi partner yang disetujui. Silakan tunggu proses peninjauan dari tim kami.</p>
      </div>
    );
  }

  if (partner.status === 'banned') {
    return (
      <div className="partner-access-denied" style={{ borderColor: '#ef4444', background: 'rgba(69, 10, 10, 0.4)' }}>
        <h2 style={{ color: '#ef4444' }}>🚨 Akun Dibanned Permanen</h2>
        <p>Akun partner Anda telah dihapus beserta seluruh proyek karena pelanggaran berat. Keputusan ini bersifat mutlak.</p>
      </div>
    );
  }



  if (partner.status !== 'approved') {
    return (
      <div className="partner-access-denied">
        <h2>Menunggu Persetujuan</h2>
        <p>Aplikasi Anda masih dalam tahap peninjauan. Mohon bersabar.</p>
      </div>
    );
  }

  const handleImageChange = (index, value) => {
    const newImages = [...form.images];
    newImages[index] = value;
    setForm({ ...form, images: newImages });
  };

  const addImageInput = () => {
    setForm({ ...form, images: [...form.images, ''] });
  };

  const removeImageInput = (index) => {
    const newImages = form.images.filter((_, i) => i !== index);
    setForm({ ...form, images: newImages });
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.downloadUrl) {
      toast.error('Judul, Deskripsi, dan Link Unduh wajib diisi.');
      return;
    }

    const toastId = toast.loading(editingId ? 'Menyimpan perubahan...' : 'Mengunggah proyek...');
    try {
      setIsSubmitting(true);
      const projectData = {
        ...form,
        price: Number(form.price) || 0,
        ownerId: user.uid,
        developerName: partner.fullName
      };

      if (editingId) {
        await updateProject(editingId, projectData);
        toast.success(`Proyek diperbarui!`, { id: toastId });
        setEditingId(null);
      } else {
        await addProject(projectData);
        toast.success(`Proyek ditambahkan!`, { id: toastId });
      }

      setForm(emptyForm);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan proyek.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (project) => {
    setForm({
      title: project.title,
      category: project.category,
      description: project.description,
      downloadUrl: project.downloadUrl,
      images: project.images || [''],
      price: project.price,
      demoUrl: project.demoUrl || '',
      isFlashSale: project.isFlashSale || false,
      discountPrice: project.discountPrice || 0,
    });
    setEditingId(project.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '250px' }}>
        <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>Yakin ingin menghapus proyek ini?</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button 
            onClick={() => toast.dismiss(t.id)}
            style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Batal
          </button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const toastId = toast.loading('Menghapus...');
              try {
                await deleteProject(id);
                toast.success('Berhasil dihapus', { id: toastId });
              } catch (e) {
                toast.error('Gagal menghapus', { id: toastId });
              }
            }}
            style={{ padding: '0.4rem 0.8rem', background: '#ef4444', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
          >
            Hapus
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawForm.amount);
    
    if (amount > partner.balance) {
      toast.error('Saldo tidak mencukupi.');
      return;
    }
    if (amount > 5000000) {
      toast.error('Maksimal penarikan Rp 5.000.000 per transaksi.');
      return;
    }
    if (amount < 100000) {
      toast.error('Minimal penarikan Rp 100.000');
      return;
    }
    if (!withdrawForm.bankName || !withdrawForm.accountNumber || !withdrawForm.accountName) {
      toast.error('Harap lengkapi semua detail bank/E-Wallet');
      return;
    }

    const formattedBankDetails = `${withdrawForm.bankName} - ${withdrawForm.accountNumber} a.n ${withdrawForm.accountName}`;

    try {
      await submitWithdrawal({
        partnerId: partner.id,
        partnerName: partner.fullName,
        amount,
        bankDetails: formattedBankDetails,
      });
      toast.success('Permintaan penarikan berhasil dikirim.');
      setWithdrawForm({ amount: '', bankName: '', accountNumber: '', accountName: '' });
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengajukan penarikan');
    }
  };

  const handleAppeal = async () => {
    const loadingToast = toast.loading('Mengirim ajuan banding...');
    try {
      const { appealSuspension } = await import('../services/partnerService');
      await appealSuspension(partner.id);
      toast.success('Ajuan banding terkirim. Admin akan meninjau kembali profil Anda.', { id: loadingToast });
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengirim ajuan banding', { id: loadingToast });
    }
  };

  if (partner.status === 'suspended') {
    return (
      <div className="partner-dashboard-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2rem', borderRadius: '16px', maxWidth: '500px' }}>
          <h2 style={{ color: '#f59e0b', fontSize: '1.5rem', marginBottom: '1rem' }}>Akun Anda Ditangguhkan (Suspended)</h2>
          <p style={{ color: '#cbd5e1', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            Akses ke dasbor dan fitur partner telah dinonaktifkan sementara karena adanya indikasi pelanggaran aturan. 
            Proyek Anda masih aman, namun Anda tidak dapat melakukan perubahan atau penarikan saldo.
          </p>
          {partner.appealRequested ? (
            <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              Ajuan banding Anda sedang ditinjau oleh Admin. Mohon tunggu proses pemeriksaan selesai.
            </div>
          ) : (
            <button onClick={handleAppeal} className="btn-primary" style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
              Ajukan Banding
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="partner-dashboard-page">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Dashboard Partner</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', color: '#94a3b8' }}>
            <span>Selamat datang, {partner.fullName}</span>
            {getBadgeTier(partner.totalEarnings) > 0 && (
              <PartnerBadge tier={getBadgeTier(partner.totalEarnings)} size="sm" />
            )}
          </div>
        </div>
        
        {!showWelcome && (
          <button 
            onClick={() => setShowWelcome(true)}
            title="Buka Panduan Partner"
            style={{
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#3b82f6',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#3b82f6';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
              e.currentTarget.style.color = '#3b82f6';
            }}
          >
            <BookOpen size={18} />
            <span className="hide-on-mobile">Panduan</span>
          </button>
        )}
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <Wallet size={32} style={{ color: '#10b981', flexShrink: 0 }} />
          <div>
            <h3>Saldo Aktif</h3>
            <p className="stat-value">Rp {(partner.balance || 0).toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="stat-card">
          <DollarSign size={32} style={{ color: '#3b82f6', flexShrink: 0 }} />
          <div>
            <h3>Total Pendapatan</h3>
            <p className="stat-value">
              Rp {((partner.balance || 0) + partnerWithdrawals.reduce((sum, w) => sum + w.amount, 0)).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <CheckCircle size={32} style={{ color: '#8b5cf6', flexShrink: 0 }} />
          <div>
            <h3>Total Penarikan</h3>
            <p className="stat-value">
              Rp {partnerWithdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <Upload size={32} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div>
            <h3>Proyek Diunggah</h3>
            <p className="stat-value">{projects.length} Proyek</p>
          </div>
        </div>
      </div>

      {/* Referral Code Banner */}
      {partner.referralCode && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '48px', height: '48px', 
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Users size={24} style={{ color: 'white' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>🤝 Kode Affiliasi Kamu</p>
              <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
                {affiliateData.code || partner.referralCode || 'Memuat...'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Bagikan ke pembeli — kamu dapat komisi <strong style={{ color: '#10b981' }}>0,25%</strong> setiap ada yang pakai kode ini!
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const code = affiliateData.code || partner.referralCode;
              navigator.clipboard.writeText(code);
              setCopiedRef(true);
              setTimeout(() => setCopiedRef(false), 2000);
              toast.success('Kode affiliasi berhasil disalin! 🎉');
            }}
            style={{
              background: copiedRef ? '#10b981' : 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              border: 'none',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
          >
            {copiedRef ? '✅ Disalin!' : '📋 Salin Kode'}
          </button>
        </div>
      )}

      {/* Affiliate Stats Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ width: 40, height: 40, background: 'rgba(16, 185, 129, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={20} style={{ color: '#10b981' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>Referral Berhasil</p>
            <p style={{ margin: '2px 0 0', fontSize: '1.35rem', fontWeight: 800, color: 'white' }}>{affiliateData.count}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#64748b' }}>real-time ⚡</p>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1))',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ width: 40, height: 40, background: 'rgba(139, 92, 246, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={20} style={{ color: '#8b5cf6' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>Komisi Affiliasi Terkumpul</p>
            <p style={{ margin: '2px 0 0', fontSize: '1.35rem', fontWeight: 800, color: 'white' }}>Rp {(affiliateData.balance || 0).toLocaleString('id-ID')}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#64748b' }}>Rp 250 per undangan ⚡</p>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1))',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ width: 40, height: 40, background: 'rgba(245, 158, 11, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wallet size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>Saldo Komisi Afiliasi</p>
            <p style={{ margin: '2px 0 0', fontSize: '1.35rem', fontWeight: 800, color: 'white' }}>Rp {(affiliateData.partnerAffiliateBalance || 0).toLocaleString('id-ID')}</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#64748b' }}>dari {affiliateData.partnerAffiliateCount || 0} undangan ⚡</p>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          <Upload size={16} /> Kelola Proyek
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart2 size={18} /> Analitik
        </button>
        <button 
          className={`tab-btn ${activeTab === 'withdraw' ? 'active' : ''}`}
          onClick={() => setActiveTab('withdraw')}
        >
          Penarikan Dana
        </button>
        <button 
          className="tab-btn" 
          onClick={() => setShowWelcome(true)}
          style={{ marginLeft: 'auto', background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
        >
          <BookOpen size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> Panduan
        </button>
      </div>

      {activeTab === 'projects' && (
        <div className="dashboard-grid">
          {/* Upload Form */}
          <div className="dashboard-card">
            <h3><Upload size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }}/> {editingId ? 'Edit Proyek' : 'Upload Proyek'}</h3>
            <form onSubmit={handleProjectSubmit} className="partner-upload-form">
              <div className="form-group">
                <label>Judul Proyek</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Kategori</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Harga (Rp) - Isi 0 jika gratis</label>
                <input 
                  type="text" 
                  value={form.price !== '' && form.price !== undefined ? form.price.toLocaleString('id-ID') : ''} 
                  onChange={e => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    setForm({...form, price: rawValue ? parseInt(rawValue, 10) : ''});
                  }} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Deskripsi</label>
                <textarea rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Link Unduh Source Code</label>
                <input type="url" value={form.downloadUrl} onChange={e => setForm({...form, downloadUrl: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Link Live Demo (Opsional)</label>
                <input type="url" value={form.demoUrl} onChange={e => setForm({...form, demoUrl: e.target.value})} placeholder="https://demo.example.com" />
              </div>
              <div className="form-group flash-sale-group" style={{ 
                background: form.isFlashSale ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(185, 28, 28, 0.15))' : 'rgba(255, 255, 255, 0.03)', 
                padding: '1.25rem', 
                borderRadius: '12px', 
                marginBottom: '1.5rem',
                border: form.isFlashSale ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: form.isFlashSale ? '#f87171' : 'white', fontSize: '1.05rem', fontWeight: 700 }}>
                      ⚡ Ikutkan Flash Sale
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                      Berikan diskon waktu terbatas untuk meningkatkan penjualan proyekmu!
                    </p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px', cursor: 'pointer', flexShrink: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={form.isFlashSale} 
                      onChange={e => setForm({...form, isFlashSale: e.target.checked})} 
                      style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                    />
                    <span style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: form.isFlashSale ? '#ef4444' : '#334155',
                      borderRadius: '34px',
                      transition: '0.3s',
                      boxShadow: form.isFlashSale ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '22px',
                        width: '22px',
                        left: form.isFlashSale ? '27px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        transition: '0.3s',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                      }} />
                    </span>
                  </label>
                </div>

                {form.isFlashSale && (
                  <div style={{ 
                    marginTop: '1.25rem', 
                    paddingTop: '1.25rem', 
                    borderTop: '1px dashed rgba(239, 68, 68, 0.3)',
                    animation: 'fadeInDown 0.3s ease forwards'
                  }}>
                    <label style={{ color: '#fca5a5', fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Harga Diskon Flash Sale *
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ 
                        position: 'absolute', 
                        left: '1rem', 
                        color: '#f87171', 
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        pointerEvents: 'none'
                      }}>
                        Rp
                      </span>
                      <input 
                        type="text" 
                        placeholder="Misal: 50000"
                        value={form.discountPrice !== '' && form.discountPrice !== undefined ? form.discountPrice.toLocaleString('id-ID') : ''}
                        onChange={e => {
                          const rawValue = e.target.value.replace(/\D/g, '');
                          setForm({...form, discountPrice: rawValue ? parseInt(rawValue, 10) : ''});
                        }} 
                        required={form.isFlashSale} 
                        style={{
                          width: '100%',
                          padding: '0.8rem 1rem 0.8rem 2.8rem',
                          borderRadius: '8px',
                          border: '2px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(0,0,0,0.2)',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(239, 68, 68, 0.4)'}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>URL Gambar</label>
                {form.images.map((img, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input type="url" value={img} onChange={e => handleImageChange(i, e.target.value)} />
                    {form.images.length > 1 && (
                      <button type="button" onClick={() => removeImageInput(i)} style={{ padding: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addImageInput} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.9rem' }}>+ Tambah Gambar</button>
              </div>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%' }}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Proyek'}
              </button>
            </form>
          </div>

          {/* Project List */}
          <div className="dashboard-card">
            <h3>Proyek Anda ({projects.length})</h3>
            {projects.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>Belum ada proyek.</p>
            ) : (
              <div className="partner-projects-list">
                {projects.map(p => (
                  <div key={p.id} className="partner-project-item">
                    <div>
                      <span style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.2)', padding: '2px 8px', borderRadius: '12px', color: '#60a5fa' }}>{p.category}</span>
                      <h4 style={{ margin: '8px 0 4px' }}>{p.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Rp {p.price.toLocaleString('id-ID')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEditClick(p)} style={{ background: 'transparent', border: 'none', color: '#fbbf24', cursor: 'pointer' }}><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(p.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'withdraw' && (
        <div className="dashboard-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h3>Tarik Penghasilan</h3>
          <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Pencairan akan diproses manual oleh Admin maksimal 3x24 jam kerja.</p>
          
          <form onSubmit={handleWithdrawSubmit} className="partner-upload-form">
            <div className="form-group">
              <label>Jumlah Penarikan (Rp)</label>
              <input 
                type="text" 
                value={withdrawForm.amount ? Number(withdrawForm.amount).toLocaleString('id-ID') : ''}
                onChange={e => {
                  const rawValue = e.target.value.replace(/[^0-9]/g, '');
                  setWithdrawForm({...withdrawForm, amount: rawValue});
                }}
                placeholder="Minimal 100.000"
                required 
              />
              <small style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>Maksimal: Rp 5.000.000</small>
              <small style={{ color: '#f59e0b', display: 'block', marginTop: '4px' }}>
                * Biaya platform: 5% (penarikan &lt; Rp 500.000), 10% (penarikan ≥ Rp 500.000).
              </small>
            </div>
            <div className="form-group">
              <label>Pilih Bank / E-Wallet</label>
              <select 
                value={withdrawForm.bankName}
                onChange={e => setWithdrawForm({...withdrawForm, bankName: e.target.value})}
                required 
              >
                <option value="">Pilih Bank atau E-Wallet...</option>
                <option value="BCA">BCA</option>
                <option value="Mandiri">Mandiri</option>
                <option value="BNI">BNI</option>
                <option value="BRI">BRI</option>
                <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                <option value="DANA">DANA</option>
                <option value="GoPay">GoPay</option>
                <option value="OVO">OVO</option>
                <option value="ShopeePay">ShopeePay</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Nomor Rekening / No. HP E-Wallet</label>
              <input 
                type="text"
                value={withdrawForm.accountNumber}
                onChange={e => setWithdrawForm({...withdrawForm, accountNumber: e.target.value})}
                placeholder="Contoh: 1234567890 / 081234567890"
                required 
              />
            </div>

            <div className="form-group">
              <label>Atas Nama (Nama Pemilik Rekening)</label>
              <input 
                type="text"
                value={withdrawForm.accountName}
                onChange={e => setWithdrawForm({...withdrawForm, accountName: e.target.value})}
                placeholder="Sesuai buku tabungan / E-Wallet"
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Ajukan Penarikan
            </button>
          </form>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="tab-content analytics-tab fade-in">
          <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Analitik Penjualan</h2>
          <SalesAnalytics projects={projects} partnerId={partner.id} />
        </div>
      )}
      
      {showWelcome && (
        <WelcomeModal 
          role="partner" 
          storageKey="hasSeenPartnerWelcome" 
          onClose={() => setShowWelcome(false)} 
        />
      )}
    </div>
    </>
  );
};

export default PartnerDashboard;
