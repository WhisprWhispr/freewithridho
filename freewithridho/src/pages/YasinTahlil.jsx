import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, ZoomIn, ZoomOut } from 'lucide-react';
import './YasinTahlil.css';

const YasinTahlil = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('yasin'); // 'yasin' or 'tahlil'
  const [data, setData] = useState({ yasin: [], tahlil: [] });
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(2); // rem value

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/data/yasin-tahlil.json');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const increaseFont = () => setFontSize(prev => Math.min(prev + 0.5, 4));
  const decreaseFont = () => setFontSize(prev => Math.max(prev - 0.5, 1.5));

  return (
    <div className="yasin-page fade-in">
      <div className="yasin-nav">
        <button onClick={() => navigate('/jadwal-sholat')} className="back-btn-top">
          <ArrowLeft size={18} /> Dashboard
        </button>
        <div className="font-controls">
          <button onClick={decreaseFont} title="Perkecil Teks"><ZoomOut size={18} /></button>
          <button onClick={increaseFont} title="Perbesar Teks"><ZoomIn size={18} /></button>
        </div>
      </div>

      <div className="yasin-header">
        <BookOpen size={40} className="yasin-icon" />
        <h1>Buku Yasin & Tahlil</h1>
        <p>Bacaan digital Surat Yasin dan doa Tahlil</p>
      </div>

      <div className="yasin-tabs">
        <button 
          className={`yasin-tab-btn ${activeTab === 'yasin' ? 'active' : ''}`}
          onClick={() => setActiveTab('yasin')}
        >
          Surat Yasin
        </button>
        <button 
          className={`yasin-tab-btn ${activeTab === 'tahlil' ? 'active' : ''}`}
          onClick={() => setActiveTab('tahlil')}
        >
          Doa Tahlil
        </button>
      </div>

      <div className="yasin-content-container">
        {loading ? (
          <div className="loading-state">Memuat data...</div>
        ) : activeTab === 'yasin' ? (
          <div className="verses-list">
            {data.yasin.map((verse) => (
              <div className="verse-card" key={verse.verseId}>
                <div className="verse-number">{verse.verseId}</div>
                <p className="verse-arabic" style={{ fontSize: `${fontSize}rem` }}>{verse.arabic}</p>
                <p className="verse-latin">{verse.latin}</p>
                <p className="verse-translation">{verse.translation}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="verses-list">
            {data.tahlil.map((item) => (
              <div className="verse-card" key={item.step}>
                <div className="tahlil-title">{item.title}</div>
                <p className="verse-arabic" style={{ fontSize: `${fontSize}rem` }}>{item.arabic}</p>
                <p className="verse-latin">{item.latin}</p>
                <p className="verse-translation">{item.translation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default YasinTahlil;
