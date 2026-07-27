import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProjects, addProject, deleteProject, updateProject, getSettings, saveSettings } from '../services/projectService';
import { getAdminStats, listenToAdminStats } from '../services/adminStatsService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import {
  Plus, Trash2, Upload, LogOut, FileText, Eye, Edit2, Settings, Key,
  ShieldCheck, BarChart3, TrendingUp, DollarSign, Briefcase,
  Receipt, Users, Check, X, Download, Wallet
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './Admin.css';

const CATEGORIES = ['Basic', 'Premium', 'Web', 'Game', 'Mobile'];

const emptyForm = {
  title: '',
  category: 'Basic',
  description: '',
  downloadUrl: '',
  readme: '',
  images: [''],
  price: 0,
  developerName: '',
};

const Admin = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTransactions: 0,
    paidTransactionsCount: 0,
    pendingTransactionsCount: 0,
    totalEarnings: 0,
    totalRevenuePending: 0
  });
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [adminBalance, setAdminBalance] = useState(0);
  
  // Tab states
  const [activeAdminTab, setActiveAdminTab] = useState('projects'); // 'projects', 'partners', 'withdrawals'
  
  // Partners state
  const [partners, setPartners] = useState([]);

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState([]);
  
  // Real-time listener for partners and withdrawals
  useEffect(() => {
    let unsubscribePartners;
    let unsubscribeWithdrawals;
    import('../services/partnerService').then(({ listenToPartners, listenToWithdrawals }) => {
      unsubscribePartners = listenToPartners((data) => {
        setPartners(data);
      });
      unsubscribeWithdrawals = listenToWithdrawals((data) => {
        setWithdrawals(data);
      });
    });
    return () => {
      if (unsubscribePartners) unsubscribePartners();
      if (unsubscribeWithdrawals) unsubscribeWithdrawals();
    };
  }, []);
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null,
    title: ''
  });
  const [deletingId, setDeletingId] = useState(null);
  const [readmeTab, setReadmeTab] = useState('edit'); // 'edit' | 'preview'
  const fileInputRef = useRef(null);
  
  // Edit state
  const [editingId, setEditingId] = useState(null);

  // Settings state
  const [midtransSettings, setMidtransSettings] = useState({ merchantId: '', serverKey: '', clientKey: '', environment: 'sandbox' });
  const [savingSettings, setSavingSettings] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'ridhosandhika18022022@gmail.com';
    if (user.email !== adminEmail) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [data, settingsData] = await Promise.all([
          getAllProjects(),
          getSettings('midtrans')
        ]);
        setProjects(data);
        if (settingsData) {
          setMidtransSettings({
            merchantId: settingsData.merchantId || '',
            serverKey: settingsData.serverKey || '',
            clientKey: settingsData.clientKey || '',
            environment: settingsData.environment || 'sandbox'
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Gagal memuat daftar proyek dan statistik.');
      } finally {
        setFetching(false);
      }
    };
    
    fetchData();

    // Set up real-time listener for admin stats
    const unsubscribeStats = listenToAdminStats((newStats) => {
      setStats(newStats);
    });

    // Listen to adminWallet for dynamic fee/balance updates
    let unsubscribeWallet;
    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      import('../firebase').then(({ db }) => {
        const adminWalletRef = doc(db, 'settings', 'adminWallet');
        unsubscribeWallet = onSnapshot(adminWalletRef, (docSnap) => {
          if (docSnap.exists()) {
            setAdminBalance(docSnap.data().balance || 0);
          }
        });
      });
    });

    return () => {
      unsubscribeStats();
      if (unsubscribeWallet) unsubscribeWallet();
    };
  }, [user, navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageChange = (index, value) => {
    const newImages = [...form.images];
    newImages[index] = value;
    setForm((prev) => ({ ...prev, images: newImages }));
  };

  const addImageInput = () => {
    setForm((prev) => ({ ...prev, images: [...prev.images, ''] }));
  };

  const removeImageInput = (index) => {
    const newImages = form.images.filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, images: newImages }));
  };

  // Handle .md file upload
  const handleReadmeFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.md') && file.type !== 'text/markdown' && file.type !== 'text/plain') {
      toast.error('Hanya file .md yang diperbolehkan!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({ ...prev, readme: ev.target.result }));
      setReadmeTab('preview');
      toast.success(`File "${file.name}" berhasil diunggah! Cek preview di bawah.`);
    };
    reader.readAsText(file, 'UTF-8');
    // reset input so the same file can be re-uploaded
    e.target.value = '';
  };
  
  const fetchProjectsList = async () => {
    try {
      const projectsData = await getAllProjects();
      setProjects(projectsData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditClick = (project) => {
    setForm(project);
    setEditingId(project.id);
    setReadmeTab('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePartnerAction = async (partnerId, status) => {
    const loadingToast = toast.loading(`Mengupdate status...`);
    try {
      const { updatePartnerStatus } = await import('../services/partnerService');
      await updatePartnerStatus(partnerId, status);
      toast.success(`Partner berhasil di-${status === 'approved' ? 'setujui' : 'tolak'}`, { id: loadingToast });
    } catch (e) {
      console.error(e);
      toast.error('Gagal update status partner', { id: loadingToast });
    }
  };

  const handleBanPartner = (partnerId, userId, partnerName) => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '250px' }}>
        <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>
          BANNED PERMANEN partner "{partnerName}"?<br/><br/>
          <span style={{fontSize: '0.8rem', color: '#ef4444'}}>Semua data dan proyeknya akan DIHAPUS. Tidak dapat dibatalkan!</span>
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={() => toast.dismiss(t.id)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Batal</button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const toastId = toast.loading('Menghapus data partner...');
              try {
                const { banPartner } = await import('../services/partnerService');
                await banPartner(partnerId, userId);
                toast.success('Partner berhasil di-Banned', { id: toastId });
              } catch (e) {
                toast.error('Gagal melakukan Banned', { id: toastId });
              }
            }}
            style={{ padding: '0.4rem 0.8rem', background: '#dc2626', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >Banned Permanen</button>
        </div>
      </div>
    ), { duration: Infinity, icon: '🚨' });
  };

  const handleSuspendPartner = (partnerId, partnerName) => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '250px' }}>
        <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>
          SUSPEND partner "{partnerName}"?<br/><br/>
          <span style={{fontSize: '0.8rem', color: '#f59e0b'}}>Akses mereka akan dinonaktifkan sementara.</span>
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={() => toast.dismiss(t.id)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Batal</button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const toastId = toast.loading('Melakukan suspend...');
              try {
                const { suspendPartner } = await import('../services/partnerService');
                await suspendPartner(partnerId);
                toast.success('Partner di-Suspend', { id: toastId });
              } catch (e) {
                toast.error('Gagal Suspend', { id: toastId });
              }
            }}
            style={{ padding: '0.4rem 0.8rem', background: '#f59e0b', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >Suspend</button>
        </div>
      </div>
    ), { duration: Infinity, icon: '⚠️' });
  };

  const handleRestorePartner = (partnerId, partnerName) => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '250px' }}>
        <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>
          PULIHKAN partner "{partnerName}"?<br/><br/>
          <span style={{fontSize: '0.8rem', color: '#10b981'}}>Akses mereka akan dikembalikan seperti semula.</span>
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button onClick={() => toast.dismiss(t.id)} style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Batal</button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const toastId = toast.loading('Memulihkan akun...');
              try {
                const { restorePartner } = await import('../services/partnerService');
                await restorePartner(partnerId);
                toast.success('Akun Dipulihkan', { id: toastId });
              } catch (e) {
                toast.error('Gagal Memulihkan', { id: toastId });
              }
            }}
            style={{ padding: '0.4rem 0.8rem', background: '#10b981', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >Pulihkan</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const exportPartnersPDF = () => {
    const doc = new jsPDF();
    doc.text('Daftar Pendaftar Partner Developer', 14, 15);
    
    const tableColumn = ["Nama", "Email", "WhatsApp", "Status", "Keahlian"];
    const tableRows = [];

    partners.forEach(p => {
      const pData = [
        p.fullName,
        p.email,
        p.phone,
        p.status,
        p.skills || '-'
      ];
      tableRows.push(pData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    
    doc.save('daftar-partner-developer.pdf');
  };

  const exportSinglePartnerPDF = (p) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246);
    doc.text('FREEWITHRIDHO', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Formulir Pendaftaran Partner', 105, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Tanggal Daftar: ${new Date(p.submittedAt).toLocaleDateString('id-ID')}`, 105, 38, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.line(20, 45, 190, 45);

    doc.setTextColor(30, 41, 59);
    let y = 55;
    const lineHeight = 10;
    
    doc.text(`Nama Lengkap   : ${p.fullName}`, 20, y); y += lineHeight;
    doc.text(`Email          : ${p.email}`, 20, y); y += lineHeight;
    doc.text(`No. WhatsApp   : ${p.phone}`, 20, y); y += lineHeight;
    doc.text(`Keahlian       : ${p.skills || '-'}`, 20, y); y += lineHeight;
    doc.text(`Link Portofolio: ${p.portfolio}`, 20, y); y += lineHeight;
    doc.text(`Status         : ${p.status.toUpperCase()}`, 20, y);
    
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('Dicetak otomatis dari Admin Panel', 105, 280, { align: 'center' });
    
    doc.save(`Data_Partner_${p.fullName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleCompleteWithdrawal = (withdrawalId, partnerId, amount) => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '250px' }}>
        <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>
          Tandai penarikan Rp {amount.toLocaleString('id-ID')} sebagai SELESAI?<br/><br/>
          <span style={{fontSize: '0.8rem', color: '#f59e0b'}}>Pastikan uang sudah ditransfer!</span>
        </p>
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
              const loadingToast = toast.loading('Memproses...');
              try {
                const { completeWithdrawal } = await import('../services/partnerService');
                await completeWithdrawal(withdrawalId, partnerId, amount);
                toast.success('Penarikan SELESAI. Saldo partner telah dikurangi.', { id: loadingToast });
              } catch (e) {
                console.error(e);
                toast.error('Gagal memproses penarikan', { id: loadingToast });
              }
            }}
            style={{ padding: '0.4rem 0.8rem', background: '#10b981', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
          >
            Selesai
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await saveSettings('midtrans', midtransSettings);
      toast.success('Pengaturan API Midtrans berhasil disimpan!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan pengaturan.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.downloadUrl) {
      toast.error('Judul, Deskripsi, dan Link Unduh wajib diisi.');
      return;
    }
    
    const loadingToast = toast.loading(editingId ? 'Menyimpan perubahan...' : 'Mengunggah proyek...');
    try {
      setLoading(true);
      const projectData = {
        ...form,
        price: Number(form.price) || 0,
      };
      
      if (editingId) {
        await updateProject(editingId, projectData);
        toast.success(`Proyek "${form.title}" berhasil diperbarui!`, { id: loadingToast });
        setEditingId(null);
      } else {
        await addProject(projectData);
        toast.success(`Proyek "${form.title}" berhasil ditambahkan!`, { id: loadingToast });
      }
      
      setForm(emptyForm);
      setReadmeTab('edit');
      fetchProjectsList();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan proyek. Cek konfigurasi Firebase.', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const initiateDelete = (id, title) => {
    setConfirmModal({ isOpen: true, id, title });
  };

  const executeDelete = async () => {
    const { id, title } = confirmModal;
    const loadingToast = toast.loading(`Menghapus "${title}"...`);
    try {
      setDeletingId(id);
      await deleteProject(id);
      toast.success(`Proyek "${title}" berhasil dihapus.`, { id: loadingToast });
      setProjects((prev) => prev.filter((p) => p.id !== id));
      const updatedStats = await getAdminStats();
      setStats(updatedStats);
    } catch {
      toast.error('Gagal menghapus proyek.', { id: loadingToast });
    } finally {
      setDeletingId(null);
      setConfirmModal({ isOpen: false, id: null, title: '' });
    }
  };

  return (
    <div className="admin-page">
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title="Hapus Proyek?"
        message={`Anda yakin ingin menghapus proyek "${confirmModal.title}"? Tindakan ini tidak dapat dibatalkan.`}
        onClose={() => setConfirmModal({ isOpen: false, id: null, title: '' })}
        onConfirm={executeDelete}
        isLoading={deletingId === confirmModal.id}
      />

      <div className="admin-container">
        {/* Admin user banner */}
        <div className="admin-user-banner">
          <div className="admin-user-info">
            <ShieldCheck size={18} />
            <span>Login sebagai: <strong>{user?.email}</strong></span>
          </div>
          <button className="btn-banner-logout" onClick={handleLogout}>
            <LogOut size={15} /> Logout
          </button>
        </div>

        {/* ── Dashboard Stats Board ── */}
        <section className="admin-stats-board">
          <div className="admin-stats-header">
            <BarChart3 size={20} />
            <h2>Dashboard Ringkasan Admin</h2>
          </div>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-icon green">
                <Wallet size={20} />
              </div>
              <div className="admin-stat-data">
                <span className="admin-stat-num">Rp {adminBalance.toLocaleString('id-ID')}</span>
                <span className="admin-stat-label">Saldo Platform (Fee Penarikan)</span>
              </div>
            </div>
            
            <div className="admin-stat-card">
              <div className="admin-stat-icon blue">
                <DollarSign size={20} />
              </div>
              <div className="admin-stat-data">
                <span className="admin-stat-num">Rp {stats.totalEarnings.toLocaleString('id-ID')}</span>
                <span className="admin-stat-label">Total Omset Platform</span>
              </div>
            </div>
            
            <div className="admin-stat-card">
              <div className="admin-stat-icon yellow">
                <TrendingUp size={20} />
              </div>
              <div className="admin-stat-data">
                <span className="admin-stat-num">Rp {stats.totalRevenuePending.toLocaleString('id-ID')}</span>
                <span className="admin-stat-label">Pendapatan Tertunda</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon blue">
                <Briefcase size={20} />
              </div>
              <div className="admin-stat-data">
                <span className="admin-stat-num">{stats.totalProjects}</span>
                <span className="admin-stat-label">Total Proyek Terunggah</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon purple">
                <Receipt size={20} />
              </div>
              <div className="admin-stat-data">
                <span className="admin-stat-num">{stats.paidTransactionsCount}</span>
                <span className="admin-stat-label">Transaksi Lunas ({stats.totalTransactions} Total)</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Admin Tabs ── */}
        <div className="admin-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <button 
            className={`admin-tab-btn ${activeAdminTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveAdminTab('projects')}
            style={{ background: activeAdminTab === 'projects' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: 'none', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
          >
            <Briefcase size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}/> Kelola Proyek
          </button>
          <button 
            className={`admin-tab-btn ${activeAdminTab === 'partners' ? 'active' : ''}`}
            onClick={() => setActiveAdminTab('partners')}
            style={{ background: activeAdminTab === 'partners' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: 'none', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
          >
            <Users size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}/> Manajemen Partner
            {partners.filter(p => p.status === 'pending').length > 0 && (
              <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                {partners.filter(p => p.status === 'pending').length}
              </span>
            )}
          </button>
          <button 
            className={`admin-tab-btn ${activeAdminTab === 'withdrawals' ? 'active' : ''}`}
            onClick={() => setActiveAdminTab('withdrawals')}
            style={{ background: activeAdminTab === 'withdrawals' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: 'none', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
          >
            <DollarSign size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}/> Penarikan Dana
            {withdrawals.filter(w => w.status === 'pending').length > 0 && (
              <span style={{ background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                {withdrawals.filter(w => w.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {activeAdminTab === 'projects' && (
          <div className="admin-grid">
            {/* Left Column: Form Upload */}
            <div className="admin-left-col">
              <section className="form-section">
                <div className="section-header">
                  <Upload size={20} />
                  <h2>{editingId ? 'Edit Proyek' : 'Upload Proyek Baru'}</h2>
                </div>
                
                <form className="admin-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Judul Proyek</label>
                    <input 
                      type="text" 
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. E-Commerce Pro"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Nama Developer (Opsional)</label>
                    <input 
                      type="text" 
                      value={form.developerName || ''}
                      onChange={(e) => setForm({ ...form, developerName: e.target.value })}
                      placeholder="e.g. Budi Santoso"
                    />
                    <small style={{ color: '#94a3b8', marginTop: '4px', display: 'block' }}>Kosongkan jika upload sendiri</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="category">Kategori *</label>
                    <select id="category" name="category" value={form.category} onChange={handleChange}>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="price">Harga (Rp) *</label>
                    <p className="field-hint">Isi 0 jika item ini gratis.</p>
                    <input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="0"
                      value={form.price}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="description">Deskripsi *</label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      placeholder="Jelaskan secara singkat isi dan fitur dari source code ini..."
                      value={form.description}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="downloadUrl">Link Unduh Source Code *</label>
                    <input
                      id="downloadUrl"
                      name="downloadUrl"
                      type="url"
                      placeholder="https://github.com/user/repo atau https://drive.google.com/..."
                      value={form.downloadUrl}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>URL Gambar (Thumbnail & Galeri)</label>
                    <p className="field-hint">Gambar pertama akan menjadi thumbnail. Tambahkan beberapa URL untuk membuat galeri (minimal 1, opsional).</p>
                    
                    <div className="image-inputs">
                      {form.images.map((imgUrl, index) => (
                        <div key={index} className="image-input-row">
                          <input
                            type="url"
                            placeholder="https://example.com/image.png"
                            value={imgUrl}
                            onChange={(e) => handleImageChange(index, e.target.value)}
                          />
                          {form.images.length > 1 && (
                            <button
                              type="button"
                              className="btn-remove-image"
                              onClick={() => removeImageInput(index)}
                              title="Hapus baris ini"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn-add-image"
                      onClick={addImageInput}
                    >
                      <Plus size={16} /> Tambah URL Gambar
                    </button>
                  </div>

                  <div className="form-group readme-editor-group">
                    <label>README.md</label>
                    <p className="field-hint">Upload file .md dari komputer, atau ketik markdown langsung. Preview akan tampil seperti GitHub.</p>

                    {/* Drag-drop / file upload zone */}
                    <div
                      className="readme-dropzone"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragging'); }}
                      onDragLeave={(e) => e.currentTarget.classList.remove('dragging')}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('dragging');
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleReadmeFile({ target: { files: [file], value: '' } });
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".md,text/markdown,text/plain"
                        style={{ display: 'none' }}
                        onChange={handleReadmeFile}
                      />
                      <div className="readme-dropzone-inner">
                        <FileText size={28} />
                        <span>Klik atau <strong>drag & drop</strong> file <code>.md</code> ke sini</span>
                        {form.readme && <span className="readme-loaded-hint">✓ Konten dimuat — lihat di tab Preview</span>}
                      </div>
                    </div>

                    {/* Editor / Preview Tabs */}
                    <div className="readme-tabs">
                      <button
                        type="button"
                        className={`readme-tab-btn ${readmeTab === 'edit' ? 'active' : ''}`}
                        onClick={() => setReadmeTab('edit')}
                      >
                        <FileText size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        className={`readme-tab-btn ${readmeTab === 'preview' ? 'active' : ''}`}
                        onClick={() => setReadmeTab('preview')}
                      >
                        <Eye size={14} /> Preview
                      </button>
                      {form.readme && (
                        <button
                          type="button"
                          className="readme-tab-clear"
                          onClick={() => { setForm(prev => ({ ...prev, readme: '' })); setReadmeTab('edit'); }}
                        >
                          Hapus konten
                        </button>
                      )}
                    </div>

                    {readmeTab === 'edit' ? (
                      <textarea
                        id="readme"
                        name="readme"
                        rows={14}
                        placeholder={`# Judul Proyek\n\nDeskripsi proyek...\n\n## Fitur\n- Fitur 1\n- [x] Fitur 2 (checklist)\n\n## Cara Penggunaan\n\`\`\`bash\nnpm install\nnpm start\n\`\`\`\n\n| Kolom 1 | Kolom 2 |\n|---------|----------|\n| Data 1  | Data 2  |`}
                        value={form.readme}
                        onChange={handleChange}
                        className="readme-textarea"
                      />
                    ) : (
                      <div className="readme-preview-wrap">
                        {form.readme ? (
                          <>
                            <div className="readme-preview-header">
                              <div className="readme-header-dot red" />
                              <div className="readme-header-dot yellow" />
                              <div className="readme-header-dot green" />
                              <span className="readme-filename">README.md</span>
                            </div>
                            <div className="markdown-body readme-preview-body">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                                components={{
                                  a: ({ href, children }) => (
                                    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                                  ),
                                  img: ({ src, alt }) => (
                                    <img src={src} alt={alt} style={{ maxWidth: '100%', borderRadius: '8px' }} />
                                  ),
                                }}
                              >
                                {form.readme}
                              </ReactMarkdown>
                            </div>
                          </>
                        ) : (
                          <div className="readme-preview-empty">
                            <FileText size={36} />
                            <p>Belum ada konten README. Upload file atau ketik di tab Edit.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button type="submit" className="btn-upload" disabled={loading}>
                    {loading ? (
                      <><span className="btn-spinner"></span> {editingId ? 'Menyimpan...' : 'Menyimpan...'}</>
                    ) : (
                      <><Upload size={18} /> {editingId ? 'Update Proyek' : 'Upload ke Firestore'}</>
                    )}
                  </button>
                </form>
              </section>

              {/* Project List */}
              <section className="admin-card">
                <div className="admin-card-header">
                  <h2>Daftar Proyek ({projects.length})</h2>
                </div>

                {fetching ? (
                  <div className="admin-loading">
                    <div className="spinner-large"></div>
                    <p>Memuat...</p>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="admin-empty">
                    <p>Belum ada proyek. Upload proyek pertama Anda di atas!</p>
                  </div>
                ) : (
                  <div className="project-list">
                    {projects.map(project => (
                      <div key={project.id} className="project-list-item">
                        <div className="list-item-info">
                          <span className={`category-badge badge-${project.category.toLowerCase()}`}>
                            {project.category}
                          </span>
                          <div>
                            <p className="list-item-title">{project.title}</p>
                            <p className="list-item-desc">{project.description}</p>
                          </div>
                        </div>
                        <div className="list-item-actions">
                          <button
                            className="btn-edit"
                            onClick={() => handleEditClick(project)}
                            title="Edit Proyek"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => initiateDelete(project.id, project.title)}
                            disabled={deletingId === project.id}
                            title="Hapus Proyek"
                          >
                            {deletingId === project.id
                              ? <span className="btn-spinner"></span>
                              : <Trash2 size={16} />
                            }
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* API Settings Section */}
              <section className="admin-card">
                <div className="admin-card-header">
                  <Settings size={20} />
                  <h2>Pengaturan API Midtrans</h2>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '0 1.25rem 1rem' }}>
                  Kunci ini akan digunakan oleh sistem backend untuk memproses pembayaran.
                </p>
                <form onSubmit={handleSaveSettings} className="upload-form" style={{ paddingTop: 0 }}>
                  <div className="form-group">
                    <label htmlFor="environment">Lingkungan (Environment)</label>
                    <select
                      id="environment"
                      value={midtransSettings.environment}
                      onChange={(e) => setMidtransSettings(prev => ({ ...prev, environment: e.target.value }))}
                      style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    >
                      <option value="sandbox">Sandbox (Pengujian)</option>
                      <option value="production">Production (Live)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="merchantId">Merchant ID</label>
                    <input
                      id="merchantId"
                      type="text"
                      placeholder="M..."
                      value={midtransSettings.merchantId}
                      onChange={(e) => setMidtransSettings({ ...midtransSettings, merchantId: e.target.value })}
                      style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="serverKey">Server Key <Key size={14} style={{ display: 'inline', marginLeft: 4, verticalAlign: 'middle' }} /></label>
                    <input
                      id="serverKey"
                      type="text"
                      placeholder="SB-Mid-server-..."
                      value={midtransSettings.serverKey}
                      onChange={(e) => setMidtransSettings(prev => ({ ...prev, serverKey: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="clientKey">Client Key <Key size={14} style={{ display: 'inline', marginLeft: 4, verticalAlign: 'middle' }} /></label>
                    <input
                      id="clientKey"
                      type="text"
                      placeholder="SB-Mid-client-..."
                      value={midtransSettings.clientKey}
                      onChange={(e) => setMidtransSettings(prev => ({ ...prev, clientKey: e.target.value }))}
                    />
                  </div>
                  <button type="submit" className="btn-upload" disabled={savingSettings} style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#818cf8', marginTop: '1rem' }}>
                    {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
                  </button>
                </form>
              </section>
            </div>
          </div>
        )}

        {activeAdminTab === 'partners' && (
          <section className="admin-partners-section" style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={24} style={{ color: '#60a5fa' }} />
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Daftar Pendaftar Partner</h2>
              </div>
              <button onClick={exportPartnersPDF} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 500, fontSize: '0.9rem', transition: 'background 0.2s' }}>
                <Download size={16} /> Unduh PDF
              </button>
            </div>
            
            {partners.length === 0 ? (
              <div className="admin-empty">
                <p>Belum ada yang mendaftar menjadi partner.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                      <th style={{ padding: '1rem' }}>Tanggal</th>
                      <th style={{ padding: '1rem' }}>Nama</th>
                      <th style={{ padding: '1rem' }}>Kontak</th>
                      <th style={{ padding: '1rem' }}>Portofolio / Info</th>
                      <th style={{ padding: '1rem' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem' }}>{new Date(p.submittedAt).toLocaleDateString('id-ID')}</td>
                        <td style={{ padding: '1rem', fontWeight: 500 }}>{p.fullName}</td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.85rem' }}>{p.email}</div>
                          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{p.phone}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <a href={p.portfolio} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.85rem', display: 'block' }}>Lihat Portofolio</a>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.skills}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '20px', 
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              background: p.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : p.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : p.status === 'suspended' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: p.status === 'approved' ? '#10b981' : p.status === 'rejected' ? '#ef4444' : p.status === 'suspended' ? '#f59e0b' : '#f59e0b'
                            }}>
                              {p.status.toUpperCase()}
                            </span>
                            {p.status === 'suspended' && p.appealRequested && (
                              <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                                Aju Banding
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => exportSinglePartnerPDF(p)}
                              title="Unduh PDF"
                              style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 500 }}
                            >
                              <Download size={14} /> PDF
                            </button>
                            {p.status === 'pending' && (
                              <>
                                <button onClick={() => handlePartnerAction(p.id, 'approved')} style={{ background: '#10b981', border: 'none', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }} title="Setujui"><Check size={14} /> Setujui</button>
                                <button onClick={() => handlePartnerAction(p.id, 'rejected')} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }} title="Tolak"><X size={14} /> Tolak</button>
                              </>
                            )}
                            {p.status === 'approved' && (
                              <>
                                <button onClick={() => handleSuspendPartner(p.id, p.fullName)} style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }} title="Suspend Sementara">Suspend</button>
                                <button onClick={() => handleBanPartner(p.id, p.userId, p.fullName)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }} title="Ban Permanen"><X size={14} /> Ban</button>
                              </>
                            )}
                            {p.status === 'suspended' && (
                              <>
                                <button onClick={() => handleRestorePartner(p.id, p.fullName)} style={{ background: '#10b981', border: 'none', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }} title="Pulihkan Akun"><Check size={14} /> Pulihkan</button>
                                <button onClick={() => handleBanPartner(p.id, p.userId, p.fullName)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }} title="Ban Permanen"><X size={14} /> Ban</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── Withdrawals Tab ── */}
        {activeAdminTab === 'withdrawals' && (
          <section style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <DollarSign size={24} style={{ color: '#f59e0b' }} />
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Permintaan Penarikan Dana</h2>
            </div>
            {withdrawals.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem 0' }}>Tidak ada permintaan penarikan saat ini.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                      <th style={{ padding: '1rem' }}>Tanggal</th>
                      <th style={{ padding: '1rem' }}>Nama Partner</th>
                      <th style={{ padding: '1rem' }}>Jumlah</th>
                      <th style={{ padding: '1rem' }}>Detail Transfer</th>
                      <th style={{ padding: '1rem' }}>Status</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map(w => (
                      <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>{new Date(w.requestedAt).toLocaleDateString('id-ID')}</td>
                        <td style={{ padding: '1rem', fontWeight: 500 }}>{w.partnerName}</td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 700, color: '#94a3b8', textDecoration: 'line-through', fontSize: '0.9rem' }}>Rp {w.amount?.toLocaleString('id-ID')}</div>
                          <div style={{ fontWeight: 700, color: '#10b981' }}>Rp {(w.netAmount || w.amount)?.toLocaleString('id-ID')}</div>
                          <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>Potongan: Rp {(w.feeAmount || 0)?.toLocaleString('id-ID')}</div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#94a3b8', maxWidth: '220px', whiteSpace: 'pre-wrap' }}>{w.bankDetails}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            background: w.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: w.status === 'completed' ? '#10b981' : '#f59e0b'
                          }}>
                            {w.status === 'completed' ? 'SELESAI' : 'PENDING'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          {w.status === 'pending' ? (
                            <button
                              onClick={() => handleCompleteWithdrawal(w.id, w.partnerId, w.amount, w.feeAmount)}
                              style={{ background: '#10b981', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                            >
                              ✅ Tandai Selesai
                            </button>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default Admin;
