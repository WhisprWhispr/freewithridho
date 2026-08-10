import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, User, Share2 } from 'lucide-react';
import './ArtikelIslamiDetail.css';

const ArtikelIslamiDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artikel, setArtikel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch('/data/artikel-islami.json');
        const data = await res.json();
        const found = data.find(a => a.id === parseInt(id));
        if (found) {
          setArtikel(found);
        } else {
          setError("Artikel tidak ditemukan.");
        }
      } catch (err) {
        setError("Gagal memuat artikel.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="artikel-detail-page fade-in loading-container">
        <p>Memuat artikel...</p>
      </div>
    );
  }

  if (error || !artikel) {
    return (
      <div className="artikel-detail-page fade-in error-container">
        <p>{error}</p>
        <button onClick={() => navigate('/artikel-islami')} className="back-btn">
          Kembali ke Daftar Artikel
        </button>
      </div>
    );
  }

  return (
    <div className="artikel-detail-page fade-in">
      <div className="artikel-detail-nav">
        <button onClick={() => navigate('/artikel-islami')} className="back-btn-top">
          <ArrowLeft size={18} /> Kembali
        </button>
        <button className="share-btn" title="Bagikan">
          <Share2 size={18} />
        </button>
      </div>

      <article className="artikel-full">
        <div className="artikel-header-section">
          <span className="artikel-category-badge">{artikel.category}</span>
          <h1 className="artikel-main-title">{artikel.title}</h1>
          <div className="artikel-meta-full">
            <div className="meta-author">
              <div className="author-avatar">
                <User size={18} />
              </div>
              <div className="author-info">
                <span className="author-name">{artikel.author}</span>
                <span className="publish-date">{artikel.date}</span>
              </div>
            </div>
            <div className="meta-read-time">
              <Clock size={16} />
              <span>{artikel.readTime}</span>
            </div>
          </div>
        </div>

        <div className="artikel-hero-image">
          <img src={artikel.image} alt={artikel.title} />
        </div>

        <div className="artikel-body-content">
          {artikel.content}
        </div>
      </article>
    </div>
  );
};

export default ArtikelIslamiDetail;
