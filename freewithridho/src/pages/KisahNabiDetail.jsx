import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import './KisahNabiDetail.css';

const KisahNabiDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [nabi, setNabi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch('/data/kisah-nabi-detail.json');
        const data = await res.json();
        const found = data.find(n => n.id === parseInt(id));
        if (found) {
          setNabi(found);
        } else {
          setError("Kisah nabi tidak ditemukan.");
        }
      } catch (err) {
        setError("Gagal memuat data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="nabi-detail-page fade-in loading-container">
        <p>Memuat kisah nabi...</p>
      </div>
    );
  }

  if (error || !nabi) {
    return (
      <div className="nabi-detail-page fade-in error-container">
        <p>{error}</p>
        <button onClick={() => navigate('/kisah-nabi')} className="back-btn">
          Kembali ke Galeri
        </button>
      </div>
    );
  }

  return (
    <div className="nabi-detail-page fade-in">
      <div className="nabi-detail-nav">
        <button onClick={() => navigate('/kisah-nabi')} className="back-btn-top">
          <ArrowLeft size={18} /> Kembali ke Galeri
        </button>
      </div>

      <div className="nabi-detail-hero">
        <img src={nabi.image} alt={nabi.name} className="hero-bg-img" />
        <div className="hero-overlay">
          <span className="nabi-badge">Kisah Nabi & Rasul</span>
          <h1 className="nabi-detail-title">{nabi.name}</h1>
          <p className="nabi-detail-traits">Karakteristik: {nabi.traits}</p>
        </div>
      </div>

      <div className="nabi-detail-content">
        <div className="content-sidebar">
          <div className="info-box">
            <h3><BookOpen size={18} /> Mukjizat</h3>
            <ul>
              {nabi.miracles.map((miracle, idx) => (
                <li key={idx}>{miracle}</li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="content-main">
          <h2>Sejarah & Perjalanan Dakwah</h2>
          <div className="full-story-text">
            {nabi.fullStory}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KisahNabiDetail;
