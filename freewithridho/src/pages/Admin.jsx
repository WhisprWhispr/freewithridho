import React, { useState, useEffect, useRef } from 'react';
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
  Receipt, Users, Check, X, Download, Wallet, Tag, BookOpen
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import PartnerBadge, { getBadgeTier } from '../components/PartnerBadge';
import PromoAdminTab from '../components/PromoAdminTab';
import WelcomeModal from '../components/WelcomeModal';
import { generatePartnerPDF } from '../utils/pdfGenerator';
import './Admin.css';

// ── Native Signature Pad ──────────────────────────────────────────────────────
const AdminSignaturePad = ({ canvasRef, onHasSignature }) => {
  const isDrawing = React.useRef(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startDraw = (e) => { e.preventDefault(); const { x, y } = getPos(e, canvas); ctx.beginPath(); ctx.moveTo(x, y); isDrawing.current = true; };
    const draw = (e) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f172a';
      const { x, y } = getPos(e, canvas); ctx.lineTo(x, y); ctx.stroke();
      onHasSignature && onHasSignature(true);
    };
    const stopDraw = (e) => { e.preventDefault(); isDrawing.current = false; };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
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
  }, [canvasRef, onHasSignature]);

  return (
    <canvas ref={canvasRef} width={320} height={140}
      style={{ width: '100%', height: '140px', display: 'block', cursor: 'crosshair', borderRadius: '8px' }}
    />
  );
};

const CATEGORIES = ['Basic', 'Premium', 'Web', 'Game', 'Mobile'];

const emptyForm = {
  title: '',
  category: 'Basic',
  description: '',
  downloadUrl: '',
  demoUrl: '',
  readme: '',
  images: [''],
  price: 0,
  isFlashSale: false,
  discountPrice: 0
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

  // Admin Approval Modal state
  const [adminApprovalModal, setAdminApprovalModal] = useState({
    isOpen: false,
    partnerId: null,
    partnerName: '',
    adminName: 'Administrator'
  });
  const adminSigCanvasRef = useRef(null);
  const [adminHasSignature, setAdminHasSignature] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Welcome modal state
  const [showWelcome, setShowWelcome] = useState(true);

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

  const handlePriceChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setForm((prev) => ({ ...prev, price: rawValue ? parseInt(rawValue, 10) : '' }));
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

  const handlePartnerAction = async (partner, status) => {
    if (status === 'approved') {
      setAdminApprovalModal({
        isOpen: true,
        partnerId: partner.id,
        partnerName: partner.fullName,
        adminName: 'Administrator'
      });
      return;
    }

    const loadingToast = toast.loading(`Mengupdate status...`);
    try {
      const { updatePartnerStatus } = await import('../services/partnerService');
      await updatePartnerStatus(partner.id, status);
      toast.success(`Partner berhasil di-tolak`, { id: loadingToast });
    } catch (e) {
      console.error(e);
      toast.error('Gagal update status partner', { id: loadingToast });
    }
  };

  const handleSubmitAdminApproval = async () => {
    if (!adminApprovalModal.adminName.trim()) {
      toast.error('Nama Admin tidak boleh kosong');
      return;
    }
    if (!adminHasSignature) {
      toast.error('Mohon isi tanda tangan Anda');
      return;
    }

    // Compress admin signature from native canvas
    const adminCanvas = adminSigCanvasRef.current;
    const adminCompressCanvas = document.createElement('canvas');
    adminCompressCanvas.width = 300;
    adminCompressCanvas.height = 100;
    const adminCtx = adminCompressCanvas.getContext('2d');
    adminCtx.fillStyle = 'white';
    adminCtx.fillRect(0, 0, 300, 100);
    adminCtx.drawImage(adminCanvas, 0, 0, 300, 100);
    const adminSigBase64 = adminCompressCanvas.toDataURL('image/jpeg', 0.5);
    
    setIsApproving(true);
    const loadingToast = toast.loading('Menyetujui partner...');
    try {
      const { approvePartnerApplication } = await import('../services/partnerService');
      await approvePartnerApplication(adminApprovalModal.partnerId, adminApprovalModal.adminName, adminSigBase64);
      
      toast.success(`Partner ${adminApprovalModal.partnerName} berhasil disetujui!`, { id: loadingToast });
      setAdminApprovalModal({ isOpen: false, partnerId: null, partnerName: '', adminName: 'Administrator' });
      setAdminHasSignature(false);
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyetujui partner', { id: loadingToast });
    } finally {
      setIsApproving(false);
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
        developerName: 'Admin',
        ownerId: user.uid,
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
    <>
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
          <div className="admin-user-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} />
            <span>Login sebagai: <strong>{user?.email}</strong></span>
            <PartnerBadge tier="admin" size="sm" />
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
                <span className="admin-stat-label">Checkout Belum Dibayar (Pending)</span>
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
        <div className="admin-tabs">
          <button 
            className={`admin-tab-btn ${activeAdminTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveAdminTab('projects')}
          >
            <Briefcase size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}/> Kelola Proyek
          </button>
          <button 
            className={`admin-tab-btn ${activeAdminTab === 'partners' ? 'active' : ''}`}
            onClick={() => setActiveAdminTab('partners')}
          >
            <Users size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}/> Manajemen Partner
            {partners.filter(p => p.status === 'pending').length > 0 && (
              <span className="admin-tab-badge admin-tab-badge-red">
                {partners.filter(p => p.status === 'pending').length}
              </span>
            )}
          </button>
          <button 
            className={`admin-tab-btn ${activeAdminTab === 'withdrawals' ? 'active' : ''}`}
            onClick={() => setActiveAdminTab('withdrawals')}
          >
            <DollarSign size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}/> Penarikan Dana
            {withdrawals.filter(w => w.status === 'pending').length > 0 && (
              <span className="admin-tab-badge admin-tab-badge-yellow">
                {withdrawals.filter(w => w.status === 'pending').length}
              </span>
            )}
          </button>
          <button 
            className={`admin-tab-btn ${activeAdminTab === 'promos' ? 'active' : ''}`}
            onClick={() => setActiveAdminTab('promos')}
          >
            <Tag size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}/> Kode Promo
          </button>
          
          {!showWelcome && (
            <button 
              onClick={() => setShowWelcome(true)}
              title="Buka Panduan Admin"
              style={{
                marginLeft: 'auto',
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
              <span>Panduan</span>
            </button>
          )}
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
                      type="text"
                      placeholder="0"
                      value={form.price !== '' && form.price !== undefined ? form.price.toLocaleString('id-ID') : ''}
                      onChange={handlePriceChange}
                      required
                    />
                  </div>

                  {form.price > 0 && (
                    <div className="form-group" style={{ 
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
                            ⚡ Aktifkan Flash Sale
                          </h4>
                          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                            Berikan diskon waktu terbatas untuk meningkatkan penjualan proyek!
                          </p>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '52px', height: '28px', cursor: 'pointer', flexShrink: 0 }}>
                          <input 
                            type="checkbox" 
                            checked={form.isFlashSale} 
                            onChange={(e) => setForm({ ...form, isFlashSale: e.target.checked })} 
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
                              onChange={(e) => {
                                const rawVal = e.target.value.replace(/[^0-9]/g, '');
                                setForm({ ...form, discountPrice: rawVal ? Number(rawVal) : 0 });
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
                  )}

                  <div className="form-group">
                    <label htmlFor="demoUrl">Link Demo Web (Opsional)</label>
                    <input
                      id="demoUrl"
                      name="demoUrl"
                      type="url"
                      placeholder="https://example.com/demo"
                      value={form.demoUrl || ''}
                      onChange={(e) => setForm({ ...form, demoUrl: e.target.value })}
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
          <section className="admin-section">
            <div className="admin-section-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Users size={22} style={{ color: '#60a5fa' }} />
                <h2 className="admin-section-title">Daftar Pendaftar Partner</h2>
              </div>
              <button onClick={exportPartnersPDF} className="btn-export-pdf">
                <Download size={16} /> Unduh PDF
              </button>
            </div>

            {partners.length === 0 ? (
              <div className="admin-empty">
                <p>Belum ada yang mendaftar menjadi partner.</p>
              </div>
            ) : (
              <div className="admin-card-list">
                {partners.map(p => (
                  <div key={p.id} className="admin-partner-card">
                    <div className="apc-top">
                      <div className="apc-info">
                        <div className="apc-name">
                          {p.fullName}
                          {getBadgeTier(p.totalEarnings) > 0 && (
                            <PartnerBadge tier={getBadgeTier(p.totalEarnings)} size="sm" />
                          )}
                        </div>
                        <div className="apc-sub">{p.email} · {p.phone}</div>
                        <div className="apc-sub">{new Date(p.submittedAt).toLocaleDateString('id-ID')}</div>
                      </div>
                      <span className={`apc-status ${p.status === 'approved' ? 'green' : p.status === 'rejected' || p.status === 'banned' ? 'red' : 'yellow'}`}>
                        {p.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="apc-portfolio">
                      <a href={p.portfolio} target="_blank" rel="noopener noreferrer">🔗 Lihat Portofolio</a>
                      {p.skills && <span className="apc-skills">{p.skills}</span>}
                    </div>
                    {p.status === 'suspended' && p.appealRequested && (
                      <span className="apc-appeal">Aju Banding</span>
                    )}
                    <div className="apc-actions">
                      <button onClick={() => exportSinglePartnerPDF(p)} className="btn-apc btn-apc-blue">
                        <Download size={13} /> PDF
                      </button>
                      {p.status === 'pending' && (
                        <>
                          <button onClick={() => handlePartnerAction(p, 'approved')} className="btn-apc btn-apc-green"><Check size={13} /> Setujui</button>
                          <button onClick={() => handlePartnerAction(p, 'rejected')} className="btn-apc btn-apc-red"><X size={13} /> Tolak</button>
                        </>
                      )}
                      {p.status === 'approved' && (
                        <>
                          <button onClick={() => handleSuspendPartner(p.id, p.fullName)} className="btn-apc btn-apc-yellow">Suspend</button>
                          <button onClick={() => handleBanPartner(p.id, p.userId, p.fullName)} className="btn-apc btn-apc-red"><X size={13} /> Ban</button>
                        </>
                      )}
                      {p.status === 'suspended' && (
                        <>
                          <button onClick={() => handleRestorePartner(p.id, p.fullName)} className="btn-apc btn-apc-green"><Check size={13} /> Pulihkan</button>
                          <button onClick={() => handleBanPartner(p.id, p.userId, p.fullName)} className="btn-apc btn-apc-red"><X size={13} /> Ban</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Withdrawals Tab ── */}
        {activeAdminTab === 'withdrawals' && (
          <section className="admin-section">
            <div className="admin-section-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <DollarSign size={22} style={{ color: '#f59e0b' }} />
                <h2 className="admin-section-title">Permintaan Penarikan Dana</h2>
              </div>
            </div>
            {withdrawals.length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem 0' }}>Tidak ada permintaan penarikan saat ini.</p>
            ) : (
              <div className="admin-card-list">
                {withdrawals.map(w => (
                  <div key={w.id} className="admin-partner-card">
                    <div className="apc-top">
                      <div className="apc-info">
                        <div className="apc-name">{w.partnerName}</div>
                        <div className="apc-sub">{new Date(w.requestedAt).toLocaleDateString('id-ID')}</div>
                        <div className="apc-sub" style={{ whiteSpace: 'pre-wrap', marginTop: '0.25rem' }}>{w.bankDetails}</div>
                      </div>
                      <span className={`apc-status ${w.status === 'completed' ? 'green' : 'yellow'}`}>
                        {w.status === 'completed' ? 'SELESAI' : 'PENDING'}
                      </span>
                    </div>
                    <div className="apc-amount">
                      <span className="apc-amount-original">Rp {w.amount?.toLocaleString('id-ID')}</span>
                      <span className="apc-amount-net">Rp {(w.netAmount || w.amount)?.toLocaleString('id-ID')}</span>
                      <span className="apc-amount-fee">Potongan: Rp {(w.feeAmount || 0)?.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="apc-actions">
                      {w.status === 'pending' ? (
                        <button
                          onClick={() => handleCompleteWithdrawal(w.id, w.partnerId, w.amount, w.feeAmount)}
                          className="btn-apc btn-apc-green"
                        >
                          ✅ Tandai Selesai
                        </button>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Sudah selesai</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Promos Tab ── */}
        {activeAdminTab === 'promos' && (
          <PromoAdminTab />
        )}
      </div>

      {showWelcome && (
        <WelcomeModal 
          role="admin" 
          storageKey="hasSeenAdminWelcome" 
          onClose={() => setShowWelcome(false)} 
        />
      )}

      {/* Admin Approval Modal */}
      {adminApprovalModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2>Persetujuan Partner</h2>
            <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>
              Silakan isi nama dan tanda tangan Anda untuk menyetujui <strong>{adminApprovalModal.partnerName}</strong> sebagai partner.
            </p>
            
            <div className="form-group">
              <label>Nama Administrator *</label>
              <input
                type="text"
                value={adminApprovalModal.adminName}
                onChange={(e) => setAdminApprovalModal({...adminApprovalModal, adminName: e.target.value})}
                placeholder="Nama Anda"
                required
              />
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Tanda Tangan *</label>
              <div style={{ border: adminHasSignature ? '2px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', background: 'white', overflow: 'hidden' }}>
                <AdminSignaturePad canvasRef={adminSigCanvasRef} onHasSignature={setAdminHasSignature} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: adminHasSignature ? '#6ee7b7' : '#94a3b8' }}>{adminHasSignature ? '✅ Tanda tangan terisi' : 'Gunakan mouse atau jari'}</span>
                <button type="button" onClick={() => {
                  if (adminSigCanvasRef.current) {
                    const ctx = adminSigCanvasRef.current.getContext('2d');
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, adminSigCanvasRef.current.width, adminSigCanvasRef.current.height);
                  }
                  setAdminHasSignature(false);
                }} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}>Hapus Coretan</button>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setAdminApprovalModal({ isOpen: false, partnerId: null, partnerName: '', adminName: 'Administrator' })}
                disabled={isApproving}
              >
                Batal
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmitAdminApproval}
                disabled={isApproving}
              >
                {isApproving ? 'Memproses...' : 'Simpan & Setujui'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Admin;
