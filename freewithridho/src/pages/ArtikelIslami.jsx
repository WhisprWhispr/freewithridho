import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, User, X } from 'lucide-react';
import './ArtikelIslami.css';

const ArtikelIslami = () => {
  const navigate = useNavigate();
  const [artikelList, setArtikelList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Semua');

  const categories = ['Semua', 'Fiqih', 'Akhlak', 'Sejarah'];

  useEffect(() => {
    const fetchArtikel = async () => {
      try {
        const res = await fetch('/data/artikel-islami.json');
        const data = await res.json();
        setArtikelList(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchArtikel();
  }, []);

  const filteredArtikel = activeCategory === 'Semua' 
    ? artikelList 
    : artikelList.filter(a => a.category === activeCategory);

  return (
    <div className="artikel-page fade-in">
      <div className="artikel-nav">
        <button onClick={() => navigate('/jadwal-sholat')} className="back-btn-top">
          <ArrowLeft size={18} /> Dashboard
        </button>
      </div>

      <div className="artikel-header">
        <BookOpen size={40} className="artikel-icon" />
        <h1>Kajian & Artikel Islami</h1>
        <p>Tingkatkan wawasan dan pemahaman agama Anda</p>
      </div>

      <div className="artikel-categories">
        {categories.map(cat => (
          <button 
            key={cat} 
            className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="artikel-grid">
        {loading ? (
          <div className="loading-state">Memuat artikel...</div>
        ) : filteredArtikel.length > 0 ? (
          filteredArtikel.map((artikel) => (
            <div 
              key={artikel.id} 
              className="artikel-card"
              onClick={() => navigate(`/artikel-islami/${artikel.id}`)}
            >
              <div className="artikel-img-container">
                <img src={artikel.image} alt={artikel.title} />
                <span className="artikel-tag">{artikel.category}</span>
              </div>
              <div className="artikel-content">
                <h3 className="artikel-title">{artikel.title}</h3>
                <div className="artikel-meta">
                  <span><User size={14} /> {artikel.author}</span>
                  <span><Clock size={14} /> {artikel.readTime}</span>
                </div>
                <p className="artikel-excerpt">{artikel.content.substring(0, 100)}...</p>
                <span className="read-more-link">Baca Selengkapnya</span>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data">Belum ada artikel di kategori ini.</div>
        )}
      </div>
    </div>
  );
};

export default ArtikelIslami;
