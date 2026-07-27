import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listenToPartnerByUserId, submitWithdrawal } from '../services/partnerService';
import { listenToProjects, addProject, deleteProject, updateProject } from '../services/projectService';
import { toast } from 'react-hot-toast';
import { DollarSign, Upload, Trash2, Edit2, Wallet, Clock, CheckCircle } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'withdraw'

  // Form states
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Withdraw states
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bankDetails: ''
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

    return () => {
      if (unsubscribePartner) unsubscribePartner();
      if (unsubscribeProjects) unsubscribeProjects();
    };
  }, [user]);

  if (loading) {
    return <div className="partner-loading">Memuat Dashboard...</div>;
  }

  if (!partner || partner.status !== 'approved') {
    return (
      <div className="partner-access-denied">
        <h2>Akses Ditolak</h2>
        <p>Anda belum menjadi partner yang disetujui. Silakan tunggu proses peninjauan dari tim kami.</p>
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

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus proyek ini?')) {
      const toastId = toast.loading('Menghapus...');
      try {
        await deleteProject(id);
        toast.success('Berhasil dihapus', { id: toastId });
      } catch (e) {
        toast.error('Gagal menghapus', { id: toastId });
      }
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawForm.amount);
    
    if (amount > partner.balance) {
      toast.error('Saldo tidak mencukupi.');
      return;
    }
    if (amount < 50000) {
      toast.error('Minimal penarikan Rp 50.000');
      return;
    }
    if (!withdrawForm.bankDetails) {
      toast.error('Harap isi detail bank/E-Wallet');
      return;
    }

    try {
      await submitWithdrawal({
        partnerId: partner.id,
        partnerName: partner.fullName,
        amount,
        bankDetails: withdrawForm.bankDetails,
      });
      toast.success('Permintaan penarikan berhasil dikirim.');
      setWithdrawForm({ amount: '', bankDetails: '' });
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengajukan penarikan');
    }
  };

  return (
    <div className="partner-dashboard-page">
      <div className="dashboard-header">
        <h1>Dashboard Partner</h1>
        <p>Selamat datang, {partner.fullName}</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <Wallet size={32} className="stat-icon" />
          <div>
            <h3>Saldo Aktif</h3>
            <p className="stat-value">Rp {(partner.balance || 0).toLocaleString('id-ID')}</p>
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
                type="number" 
                min="50000" 
                max={partner.balance || 0}
                value={withdrawForm.amount}
                onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                placeholder="Minimal 50000"
                required 
              />
              <small style={{ color: '#94a3b8' }}>Maksimal: Rp {(partner.balance || 0).toLocaleString('id-ID')}</small>
            </div>
            <div className="form-group">
              <label>Detail Bank / E-Wallet</label>
              <textarea 
                rows="3"
                value={withdrawForm.bankDetails}
                onChange={e => setWithdrawForm({...withdrawForm, bankDetails: e.target.value})}
                placeholder="Contoh: BCA 123456789 a.n Budi Santoso / DANA 081234567890 a.n Budi"
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
