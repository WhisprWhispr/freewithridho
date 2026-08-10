import React, { useState, useEffect } from 'react';
import { getMosques, addMosque, deleteMosque, updateMosque } from '../services/mosqueService';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const MosqueAdminTab = () => {
  const [mosques, setMosques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
    imageUrl: ''
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    fetchMosques();
  }, []);

  const fetchMosques = async () => {
    setLoading(true);
    try {
      const data = await getMosques();
      setMosques(data);
    } catch (err) {
      toast.error('Gagal mengambil data masjid');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenForm = (mosque = null) => {
    if (mosque) {
      setEditingId(mosque.id);
      setFormData({
        name: mosque.name,
        description: mosque.description,
        bankName: mosque.bankName || '',
        accountNumber: mosque.accountNumber || '',
        accountName: mosque.accountName || '',
        imageUrl: mosque.imageUrl || ''
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', description: '', bankName: '', accountNumber: '', accountName: '', imageUrl: '' });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.bankName || !formData.accountNumber) {
      toast.error('Nama Masjid, Bank, dan Rekening wajib diisi');
      return;
    }

    try {
      if (editingId) {
        await updateMosque(editingId, formData);
        toast.success('Masjid berhasil diperbarui');
      } else {
        await addMosque(formData);
        toast.success('Masjid berhasil ditambahkan');
      }
      handleCloseForm();
      fetchMosques();
    } catch (err) {
      toast.error('Gagal menyimpan data masjid');
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteMosque(confirmDeleteId);
      toast.success('Masjid berhasil dihapus');
      setConfirmDeleteId(null);
      fetchMosques();
    } catch (err) {
      toast.error('Gagal menghapus masjid');
    }
  };

  return (
    <div className="admin-tab-content">
      <div className="admin-header-actions">
        <h2>Kelola Donasi Masjid</h2>
        <button className="btn-primary" onClick={() => handleOpenForm()}>
          <Plus size={18} /> Tambah Masjid
        </button>
      </div>

      {isFormOpen && (
        <div className="admin-form-card" style={{ marginBottom: '2rem', padding: '1.5rem', background: '#1e293b', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>{editingId ? 'Edit Masjid' : 'Tambah Masjid Baru'}</h3>
            <button onClick={handleCloseForm} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label>Nama Masjid</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Contoh: Masjid Istiqlal" required />
            </div>
            <div className="form-group">
              <label>Deskripsi Singkat / Kebutuhan Donasi</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={3} placeholder="Contoh: Membutuhkan dana untuk renovasi atap yang bocor..." required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Nama Bank</label>
                <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} placeholder="Contoh: BSI, BCA, Mandiri" required />
              </div>
              <div className="form-group">
                <label>Nomor Rekening</label>
                <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange} placeholder="1234567890" required />
              </div>
              <div className="form-group">
                <label>Atas Nama (A.N)</label>
                <input type="text" name="accountName" value={formData.accountName} onChange={handleChange} placeholder="DKM Masjid Istiqlal" required />
              </div>
            </div>
            <div className="form-group">
              <label>URL Gambar Masjid (Opsional)</label>
              <input type="text" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://contoh.com/gambar-masjid.jpg" />
            </div>
            <button type="submit" className="btn-primary" style={{ justifySelf: 'start', marginTop: '1rem' }}>
              <Save size={18} /> Simpan Data
            </button>
          </form>
        </div>
      )}

      <div className="table-responsive">
        {loading ? (
          <p>Memuat data...</p>
        ) : mosques.length === 0 ? (
          <p>Belum ada data masjid yang membutuhkan donasi.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nama Masjid</th>
                <th>Bank</th>
                <th>Rekening</th>
                <th>Deskripsi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {mosques.map(mosque => (
                <tr key={mosque.id}>
                  <td><strong>{mosque.name}</strong></td>
                  <td>{mosque.bankName}</td>
                  <td>{mosque.accountNumber} <br/><small>a.n {mosque.accountName}</small></td>
                  <td>{mosque.description.substring(0, 50)}...</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon btn-edit" onClick={() => handleOpenForm(mosque)} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-icon btn-delete" onClick={() => setConfirmDeleteId(mosque.id)} title="Hapus">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Hapus Data Masjid"
        message="Apakah Anda yakin ingin menghapus masjid ini dari daftar donasi? Data yang dihapus tidak dapat dikembalikan."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default MosqueAdminTab;
