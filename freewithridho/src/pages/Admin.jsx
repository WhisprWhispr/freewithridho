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
  Receipt
} from 'lucide-react';
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
  const [midtransSettings, setMidtransSettings] = useState({ serverKey: '', clientKey: '' });
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
            serverKey: settingsData.serverKey || '',
            clientKey: settingsData.clientKey || ''
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

    return () => {
      unsubscribeStats();
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
                <DollarSign size={20} />
              </div>
              <div className="admin-stat-data">
                <span className="admin-stat-num">Rp {stats.totalEarnings.toLocaleString('id-ID')}</span>
                <span className="admin-stat-label">Total Pendapatan (Lunas)</span>
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

        {/* Upload Form */}
        <section className="admin-card">
          <div className="admin-card-header">
            <Plus size={20} />
            <h2>Upload Proyek Baru</h2>
          </div>

          <form onSubmit={handleSubmit} className="upload-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="title">Judul Proyek *</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="e.g. E-Commerce Dashboard"
                  value={form.title}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="category">Kategori *</label>
                <select id="category" name="category" value={form.category} onChange={handleChange}>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
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
  );
};

export default Admin;
