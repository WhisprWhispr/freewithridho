import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Library, X } from 'lucide-react';
import './KisahNabi.css';

const KisahNabi = () => {
  const navigate = useNavigate();
  const [nabiList, setNabiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNabi, setSelectedNabi] = useState(null);

  useEffect(() => {
    const fetchNabi = async () => {
      try {
        const res = await fetch('/data/kisah-nabi-detail.json');
        const data = await res.json();
        setNabiList(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNabi();
  }, []);

  const handleNabiClick = (id) => {
    navigate(`/kisah-nabi/${id}`);
  };

  return (
    <div className="kisah-page fade-in">
      <div className="kisah-nav">
        <button onClick={() => navigate('/jadwal-sholat')} className="back-btn-top">
          <ArrowLeft size={18} /> Dashboard
        </button>
      </div>

      <div className="kisah-header">
        <Library size={40} className="kisah-icon" />
        <h1>Kisah 25 Nabi & Rasul</h1>
        <p>Sejarah dan teladan dari para utusan Allah</p>
      </div>

      <div className="nabi-grid">
        {loading ? (
          <div className="loading-state">Memuat data kisah nabi...</div>
        ) : (
          nabiList.map((nabi) => (
            <div 
              key={nabi.id} 
              className="nabi-card"
              onClick={() => handleNabiClick(nabi.id)}
            >
              <div className="nabi-number">{nabi.id}</div>
              <h3 className="nabi-name">{nabi.name}</h3>
              <p className="nabi-summary">{nabi.summary.substring(0, 80)}...</p>
              <span className="read-more">Baca Kisah &rarr;</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KisahNabi;
