import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './AsmaulHusna.css';

const AsmaulHusna = () => {
  const navigate = useNavigate();
  const [names, setNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const nameRefs = useRef([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    const fetchNames = async () => {
      try {
        const response = await fetch('https://api.aladhan.com/v1/asmaAlHusna');
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        setNames(data.data);
      } catch (error) {
        console.error('Error fetching Asmaul Husna:', error);
        toast.error('Gagal memuat Asmaul Husna');
      } finally {
        setLoading(false);
      }
    };

    fetchNames();
  }, []);

  const playSequence = (index) => {
    if (!isPlayingRef.current || index >= names.length) {
      isPlayingRef.current = false;
      setPlayingIndex(-1);
      return;
    }

    setPlayingIndex(index);
    const item = names[index];
    
    if (nameRefs.current[index]) {
      nameRefs.current[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const utterance = new SpeechSynthesisUtterance(item.name);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.85;
    
    utterance.onend = () => {
      if (isPlayingRef.current) {
         setTimeout(() => {
            if (isPlayingRef.current) playSequence(index + 1);
         }, 800);
      }
    };

    utterance.onerror = () => {
      if (isPlayingRef.current) {
         setTimeout(() => {
            if (isPlayingRef.current) playSequence(index + 1);
         }, 800);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const togglePlay = () => {
    if (isPlayingRef.current) {
      window.speechSynthesis.cancel();
      isPlayingRef.current = false;
      setPlayingIndex(-1);
    } else {
      isPlayingRef.current = true;
      playSequence(0);
    }
  };

  return (
    <div className="asmaul-husna-page fade-in">
      <button onClick={() => navigate('/jadwal-sholat')} className="back-btn-top">
        <ArrowLeft size={18} /> Kembali ke Dashboard
      </button>

      <div className="ah-header">
        <h1>Asmaul Husna</h1>
        <p>99 Nama Allah yang Maha Indah</p>
        <button 
          className={`ah-play-btn ${playingIndex !== -1 ? 'playing' : ''}`}
          onClick={togglePlay}
        >
          {playingIndex !== -1 ? <Pause size={18} /> : <Play size={18} />}
          {playingIndex !== -1 ? 'Hentikan Audio' : 'Putar Audio Berurutan'}
        </button>
      </div>

      {loading ? (
        <div className="ah-loading">
          <div className="spinner"></div>
          <p>Memuat Asmaul Husna...</p>
        </div>
      ) : (
        <div className="ah-grid">
          {names.map((item, index) => (
            <div 
              key={item.number} 
              className={`ah-card ${playingIndex === index ? 'active-playing' : ''}`}
              ref={(el) => (nameRefs.current[index] = el)}
            >
              <div className="ah-number">{item.number}</div>
              <div className="ah-arabic">{item.name}</div>
              <div className="ah-latin">{item.transliteration}</div>
              <div className="ah-meaning">{item.en.meaning}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AsmaulHusna;
