import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Tag, Plus, Trash2, Check, X } from 'lucide-react';
import './PromoAdminTab.css';

const emptyPromo = {
  code: '',
  description: '',
  type: 'percent',
  value: 0,
  active: true,
  minPurchase: 0,
  maxUsage: 100,
};

const PromoAdminTab = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyPromo);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Realtime listener for promo codes
    const unsubscribe = onSnapshot(collection(db, 'promoCodes'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPromos(data);
      setLoading(false);
    }, (e) => {
      toast.error('Gagal mengambil data promo');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    const codeId = form.code.trim().toUpperCase();
    if (!codeId) { toast.error('Kode promo wajib diisi'); return; }
    
    setSubmitting(true);
    try {
      await setDoc(doc(db, 'promoCodes', codeId), {
        ...form,
        code: codeId,
        usageCount: 0,
        createdAt: serverTimestamp()
      });
      toast.success('Promo berhasil dibuat!');
      setForm(emptyPromo);
      // onSnapshot listener will auto-update the list
    } catch (e) {
      toast.error('Gagal membuat promo');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePromoStatus = async (id, currentStatus) => {
    try {
      await setDoc(doc(db, 'promoCodes', id), { active: !currentStatus }, { merge: true });
      // onSnapshot listener will auto-update the list
    } catch (e) {
      toast.error('Gagal mengubah status');
    }
  };

  const deletePromo = async (id) => {
    if (!window.confirm('Yakin ingin menghapus promo ini?')) return;
    try {
      await deleteDoc(doc(db, 'promoCodes', id));
      toast.success('Promo dihapus');
      // onSnapshot listener will auto-update the list
    } catch (e) {
      toast.error('Gagal menghapus promo');
    }
  };

  return (
    <div className="promo-admin">
      <div className="admin-grid">
        <div className="admin-left-col">
          <section className="form-section">
            <div className="section-header">
              <Plus size={20} />
              <h2>Buat Promo Baru</h2>
            </div>
            <form className="admin-form" onSubmit={handleCreatePromo}>
              <div className="form-group">
                <label>Kode Promo (Misal: DISKON50)</label>
                <input 
                  type="text" 
                  value={form.code} 
                  onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Deskripsi Singkat</label>
                <input 
                  type="text" 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label>Tipe Diskon</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="percent">Persentase (%)</option>
                    <option value="fixed">Nominal (Rp)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>Nilai ({form.type === 'percent' ? '%' : 'Rp'})</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={form.value} 
                    onChange={e => setForm({...form, value: Number(e.target.value)})} 
                    required 
                  />
                </div>
              </div>
              <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label>Minimal Pembelian (Rp)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={form.minPurchase} 
                    onChange={e => setForm({...form, minPurchase: Number(e.target.value)})} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Batas Penggunaan (Total)</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={form.maxUsage} 
                    onChange={e => setForm({...form, maxUsage: Number(e.target.value)})} 
                  />
                </div>
              </div>
              <button type="submit" className="btn-upload" disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Buat Promo'}
              </button>
            </form>
          </section>
        </div>
        <div className="admin-right-col">
          <section className="admin-card">
            <div className="admin-card-header">
              <Tag size={20} />
              <h2>Daftar Promo</h2>
            </div>
            {loading ? (
              <p>Memuat...</p>
            ) : promos.length === 0 ? (
              <p>Belum ada promo.</p>
            ) : (
              <div className="promo-list">
                {promos.map(promo => (
                  <div key={promo.id} className={`promo-card ${!promo.active ? 'inactive' : ''}`}>
                    <div className="promo-header">
                      <h3>{promo.code}</h3>
                      <span className={`promo-status ${promo.active ? 'active' : ''}`}>
                        {promo.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="promo-desc">{promo.description || '-'}</p>
                    <div className="promo-details">
                      <span>Diskon: {promo.type === 'percent' ? `${promo.value}%` : `Rp ${promo.value.toLocaleString()}`}</span>
                      <span>Terpakai: {promo.usageCount || 0} / {promo.maxUsage}</span>
                      <span>Min. Beli: Rp {promo.minPurchase.toLocaleString()}</span>
                    </div>
                    <div className="promo-actions">
                      <button 
                        className={`btn-promo-toggle ${promo.active ? 'off' : 'on'}`} 
                        onClick={() => togglePromoStatus(promo.id, promo.active)}
                      >
                        {promo.active ? <X size={14}/> : <Check size={14}/>} {promo.active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button className="btn-promo-del" onClick={() => deletePromo(promo.id)}>
                        <Trash2 size={14} /> Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default PromoAdminTab;
