import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToPartnerByUserId, submitWithdrawal } from '../services/partnerService';
import { listenToProjects, addProject, deleteProject, updateProject } from '../services/projectService';
import { toast } from 'react-hot-toast';
import { DollarSign, Upload, Trash2, Edit2, Wallet, Clock, CheckCircle } from 'lucide-react';
import PartnerBadge, { getBadgeTier } from '../components/PartnerBadge';
import './PartnerDashboard.css';

const CATEGORIES = ['Basic', 'Premium', 'Web', 'Game', 'Mobile'];

const emptyForm = {
  title: '',
  category: 'Basic',
  description: '',
  downloadUrl: '',
  images: [''],
  price: 0,
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

  useEffect(() => {
    if (!user) return;
    const unsubscribePartner = listenToPartnerByUserId(user.uid, (data) => {
      setPartner(data);
      setLoading(false);
    });

    const unsubscribeProjects = listenToProjects((allProjects) => {
      // Filter projects that belong to this partner
      const myProjects = allProjects.filter(p => p.ownerId === user.uid);
      setProjects(myProjects);
    });

    let unsubscribeWithdrawals;
    import('../services/partnerService').then(({ listenToWithdrawals }) => {
      unsubscribeWithdrawals = listenToWithdrawals((allWithdrawals) => {
        const myWithdrawals = allWithdrawals.filter(w => w.partnerId === partner?.id);
        setPartnerWithdrawals(myWithdrawals);
      });
    });

    return () => {
      if (unsubscribePartner) unsubscribePartner();
      if (unsubscribeProjects) unsubscribeProjects();
      if (unsubscribeWithdrawals) unsubscribeWithdrawals();
    };
  }, [user, partner?.id]);

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

  if (partner.status === 'suspended') {
    const handleAppeal = async () => {
      try {
        const { appealSuspension } = await import('../services/partnerService');
        await appealSuspension(partner.id);
        toast.success('Pengajuan banding berhasil dikirim. Tim kami akan segera meninjaunya.', { duration: 4000 });
      } catch (err) {
        toast.error('Gagal mengajukan banding: ' + err.message);
      }
    };

    return (
      <div className="partner-access-denied" style={{ borderColor: '#f59e0b', background: 'rgba(30, 41, 59, 0.8)' }}>
        <h2 style={{ color: '#f59e0b' }}>⚠️ Akun Disuspend Sementara</h2>
        <p>Dashboard Partner Anda dikunci sementara karena terindikasi melanggar pedoman komunitas.</p>
        {partner.appealRequested ? (
          <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', borderRadius: '8px', color: '#93c5fd' }}>
            ⏳ Pengajuan banding Anda sedang dalam proses peninjauan oleh Admin.
          </div>
        ) : (
          <button onClick={handleAppeal} style={{ marginTop: '1.5rem', background: '#f59e0b', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            Ajukan Banding Sekarang
          </button>
        )}
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
    <div className="partner-dashboard-page">
      <div className="dashboard-header">
        <h1>Dashboard Partner</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', color: '#94a3b8' }}>
          <span>Selamat datang, {partner.fullName}</span>
          {getBadgeTier(partner.totalEarnings) > 0 && (
            <PartnerBadge tier={getBadgeTier(partner.totalEarnings)} size="sm" />
          )}
        </div>
      </div>

      <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Wallet size={32} style={{ color: '#10b981' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Saldo Aktif</h3>
            <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>Rp {(partner.balance || 0).toLocaleString('id-ID')}</p>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <DollarSign size={32} style={{ color: '#3b82f6' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Total Pendapatan</h3>
            <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>
              Rp {((partner.balance || 0) + partnerWithdrawals.reduce((sum, w) => sum + w.amount, 0)).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <CheckCircle size={32} style={{ color: '#8b5cf6' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Total Penarikan</h3>
            <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>
              Rp {partnerWithdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount, 0).toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Upload size={32} style={{ color: '#f59e0b' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Proyek Diunggah</h3>
            <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{projects.length} Proyek</p>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          Proyek Saya
        </button>
        <button 
          className={`tab-btn ${activeTab === 'withdraw' ? 'active' : ''}`}
          onClick={() => setActiveTab('withdraw')}
        >
          Penarikan Dana
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
                <input type="number" min="0" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
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
          <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Pencairan akan diproses manual oleh Admin maksimal 2x24 jam kerja.</p>
          
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
    </div>
  );
};

export default PartnerDashboard;
