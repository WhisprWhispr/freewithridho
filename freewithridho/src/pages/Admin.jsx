import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProjects, addProject, deleteProject } from '../services/projectService';
import { getAdminStats } from '../services/adminStatsService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import {
  Plus, Trash2, Upload, LogOut,
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
  
  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    id: null,
    title: ''
  });
  const [deletingId, setDeletingId] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const fetchProjectsAndStats = async () => {
    try {
      setFetching(true);
      const [projectsData, statsData] = await Promise.all([
        getAllProjects(),
        getAdminStats()
      ]);
      setProjects(projectsData);
      setStats(statsData);
    } catch {
      toast.error('Gagal memuat daftar proyek dan statistik.');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndStats();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.downloadUrl) {
      toast.error('Judul, Deskripsi, dan Link Unduh wajib diisi.');
      return;
    }
    
    const loadingToast = toast.loading('Mengunggah proyek...');
    try {
      setLoading(true);
      const projectData = {
        ...form,
        price: Number(form.price) || 0,
      };
      await addProject(projectData);
      setForm(emptyForm);
      toast.success(`Proyek "${form.title}" berhasil ditambahkan!`, { id: loadingToast });
      await fetchProjectsAndStats();
    } catch {
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

            <div className="form-group">
              <label htmlFor="readme">Konten README.md</label>
              <p className="field-hint">Paste isi file README.md dalam format Markdown di sini.</p>
              <textarea
                id="readme"
                name="readme"
                rows={12}
                placeholder={`# Judul Proyek\n\nDeskripsi proyek...\n\n## Fitur\n- Fitur 1\n- Fitur 2\n\n## Cara Penggunaan\n\`\`\`bash\nnpm install\nnpm start\n\`\`\``}
                value={form.readme}
                onChange={handleChange}
                className="readme-textarea"
              />
            </div>

            <button type="submit" className="btn-upload" disabled={loading}>
              {loading ? (
                <><span className="btn-spinner"></span> Menyimpan...</>
              ) : (
                <><Upload size={18} /> Upload ke Firestore</>
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
                  <button
                    className="btn-delete"
                    onClick={() => initiateDelete(project.id, project.title)}
                    disabled={deletingId === project.id}
                  >
                    {deletingId === project.id
                      ? <span className="btn-spinner"></span>
                      : <Trash2 size={16} />
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Admin;
