import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { submitPartnerApplication } from '../services/partnerService';
import { Briefcase, Mail, User, Phone, Link2, FileText, Send, CheckCircle } from 'lucide-react';
import './BecomePartner.css';

const BecomePartner = () => {
  const navigate = useNavigate();
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.phone || !form.portfolio) {
      toast.error('Mohon lengkapi data yang wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitPartnerApplication(form);
      setIsSuccess(true);
      toast.success('Pendaftaran berhasil dikirim!');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="partner-page success-view">
        <div className="partner-success-card">
          <CheckCircle size={64} className="success-icon" />
          <h2>Pendaftaran Berhasil!</h2>
          <p>Terima kasih telah mendaftar sebagai Partner Developer. Tim kami akan meninjau pendaftaran Anda dan menghubungi Anda melalui email atau WhatsApp.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Kembali ke Beranda
          </button>
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
          <form className="partner-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label><User size={16} /> Nama Lengkap *</label>
              <input 
                type="text" 
                name="fullName" 
                value={form.fullName} 
                onChange={handleChange} 
                placeholder="Contoh: Budi Santoso"
                required 
              />
            </div>
            
            <div className="form-group">
              <label><Mail size={16} /> Email Aktif *</label>
              <input 
                type="email" 
                name="email" 
                value={form.email} 
                onChange={handleChange} 
                placeholder="budi@example.com"
                required 
              />
            </div>

            <div className="form-group">
              <label><Phone size={16} /> Nomor WhatsApp *</label>
              <input 
                type="text" 
                name="phone" 
                value={form.phone} 
                onChange={handleChange} 
                placeholder="Contoh: 081234567890"
                required 
              />
            </div>

            <div className="form-group">
              <label><Link2 size={16} /> Link Portofolio / GitHub *</label>
              <input 
                type="url" 
                name="portfolio" 
                value={form.portfolio} 
                onChange={handleChange} 
                placeholder="https://github.com/username"
                required 
              />
            </div>

            <div className="form-group">
              <label><Briefcase size={16} /> Keahlian (Tech Stack)</label>
              <input 
                type="text" 
                name="skills" 
                value={form.skills} 
                onChange={handleChange} 
                placeholder="Contoh: React, Node.js, Flutter" 
              />
            </div>

            <div className="form-group">
              <label><FileText size={16} /> Kenapa Anda ingin bergabung?</label>
              <textarea 
                name="reason" 
                value={form.reason} 
                onChange={handleChange} 
                rows="3" 
                placeholder="Ceritakan sedikit tentang motivasi Anda..."
              ></textarea>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary submit-btn"
              disabled={isSubmitting}
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
