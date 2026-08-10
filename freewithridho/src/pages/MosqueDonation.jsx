import React, { useState, useEffect } from 'react';
import { getMosques } from '../services/mosqueService';
import { BookOpen, Copy, CheckCircle2, ChevronRight, Share2, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './InfoPages.css';
import './MosqueDonation.css'; // We will create this

const MosqueDonation = () => {
  const [mosques, setMosques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const fetchMosques = async () => {
      try {
        const data = await getMosques();
        setMosques(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMosques();
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Nomor rekening disalin!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="mosque-page-container">
      <div className="mosque-header-section">
        <div className="mosque-icon-wrapper">
          <BookOpen size={48} />
        </div>
        <h1 className="mosque-main-title">Program Donasi Masjid</h1>
        <p className="mosque-main-desc">
          Salurkan infaq dan sedekah Anda langsung ke masjid-masjid yang sedang membutuhkan bantuan operasional, renovasi, atau pembangunan.
        </p>
      </div>

      <div className="mosque-list-container">
        {loading ? (
          <div className="mosque-loading">Memuat daftar masjid...</div>
        ) : mosques.length === 0 ? (
          <div className="mosque-empty">
            <BookOpen size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>Alhamdulillah, saat ini belum ada data masjid yang membutuhkan donasi.</p>
          </div>
        ) : (
          <div className="mosque-grid">
            {mosques.map((mosque) => (
              <div className="mosque-card" key={mosque.id}>
                {mosque.imageUrl && (
                  <div className="mosque-image-container">
                    <img src={mosque.imageUrl} alt={mosque.name} className="mosque-image" />
                    <div className="mosque-image-overlay"></div>
                  </div>
                )}
                <div className="mosque-card-content">
                  <div className="mosque-card-header">
                    <h3 className="mosque-name">{mosque.name}</h3>
                  </div>
                  <p className="mosque-description">{mosque.description}</p>
                  
                  <div className="mosque-bank-info">
                    <div className="bank-details">
                      <span className="bank-name">{mosque.bankName}</span>
                      <span className="account-number">{mosque.accountNumber}</span>
                      <span className="account-name">a.n. {mosque.accountName}</span>
                    </div>
                    <button 
                      className={`copy-btn ${copiedId === mosque.id ? 'copied' : ''}`}
                      onClick={() => handleCopy(mosque.accountNumber, mosque.id)}
                    >
                      {copiedId === mosque.id ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                      {copiedId === mosque.id ? 'Tersalin' : 'Salin Rekening'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MosqueDonation;
