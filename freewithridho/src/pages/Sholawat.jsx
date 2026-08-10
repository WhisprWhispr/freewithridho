import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import './Sholawat.css';

const Sholawat = () => {
  const navigate = useNavigate();
  const [sholawatList, setSholawatList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSholawat = async () => {
      try {
        const res = await fetch('/data/sholawat.json');
        const data = await res.json();
        setSholawatList(data);
      } catch (err) {
        console.error('Failed to fetch sholawat data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSholawat();
  }, []);

  return (
    <div className="sholawat-page fade-in">
      <div className="sholawat-nav">
        <button onClick={() => navigate('/jadwal-sholat')} className="back-btn-top">
          <ArrowLeft size={18} /> Dashboard
        </button>
      </div>

      <div className="sholawat-header">
        <Star size={40} className="sholawat-icon" />
        <h1>Kumpulan Sholawat</h1>
        <p>Bacaan sholawat populer beserta fadhilah dan keutamaannya</p>
      </div>

      <div className="sholawat-container">
        {loading ? (
          <div className="loading-state">Memuat data sholawat...</div>
        ) : (
          <div className="sholawat-list">
            {sholawatList.map((item) => (
              <div key={item.id} className="sholawat-card">
                <h3 className="sholawat-title">{item.title}</h3>
                <p className="sholawat-arabic">{item.arabic}</p>
                <p className="sholawat-latin">{item.latin}</p>
                <div className="sholawat-translation">
                  <strong>Artinya:</strong> {item.translation}
                </div>
                <div className="sholawat-fadhilah">
                  <span className="fadhilah-badge">Fadhilah & Keutamaan</span>
                  <p>{item.fadhilah}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sholawat;
