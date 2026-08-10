import React, { useState } from 'react';
import { Heart, Send } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import './InfoPages.css';

const Support = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.message) {
      toast.error('Nama dan pesan wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedbacks'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      toast.success('Terima kasih! Dukungan Anda telah terkirim.');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error("Error adding document: ", error);
      toast.error('Gagal mengirim dukungan, coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="info-page-container">
      <div className="info-page-content">
        <div className="info-icon-wrapper heart">
          <Heart size={40} />
        </div>
        <h1 className="info-title">Kirim Dukungan</h1>
        <p className="info-desc">
          Terima kasih telah menggunakan layanan FREEWITHRIDHO. Anda dapat mendukung kami dengan mengirimkan <em>feedback</em> atau pesan dukungan positif!
        </p>
        
        <form onSubmit={handleSubmit} className="support-form">
          <div className="form-group">
            <input 
              type="text" 
              name="name" 
              placeholder="Nama Anda" 
              value={formData.name}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="form-group">
            <input 
              type="email" 
              name="email" 
              placeholder="Email (Opsional)" 
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
          <div className="form-group">
            <textarea 
              name="message" 
              placeholder="Tulis pesan dukungan Anda di sini..." 
              value={formData.message}
              onChange={handleChange}
              rows={4}
              disabled={isSubmitting}
              required
            />
          </div>
          <button type="submit" className="info-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Mengirim...' : <><Send size={20} /> Kirim Dukungan</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Support;
