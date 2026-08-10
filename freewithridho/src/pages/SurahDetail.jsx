import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import './SurahDetail.css';

const toArabicNumber = (number) => {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return number.toString().split('').map(digit => arabicNumbers[parseInt(digit)]).join('');
};

const SurahDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [surah, setSurah] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const ayatRefs = useRef([]);

  useEffect(() => {
    const fetchSurahDetail = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://equran.id/api/v2/surat/${id}`);
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        setSurah(data.data);
      } catch (error) {
        console.error('Error fetching surah details:', error);
        toast.error('Gagal memuat detail Surah');
      } finally {
        setLoading(false);
      }
    };

    fetchSurahDetail();

    // Cleanup audio on unmount or route change
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [id]);

  const handlePlayAudio = (url, identifier, index = -1) => {
    if (playingAudio === identifier) {
      // Pause
      audioElement.pause();
      setPlayingAudio(null);
    } else {
      // Stop current if any
      if (audioElement) {
        audioElement.pause();
      }
      
      const audio = new Audio(url);
      audio.play();
      
      audio.onended = () => {
        if (index !== -1 && index + 1 < surah.ayat.length) {
          // Play next ayah automatically
          const nextAyat = surah.ayat[index + 1];
          if (nextAyat.audio && nextAyat.audio['05']) {
             handlePlayAudio(nextAyat.audio['05'], `ayat-${nextAyat.nomorAyat}`, index + 1);
          } else {
             setPlayingAudio(null);
          }
        } else {
          setPlayingAudio(null);
        }
      };

      setAudioElement(audio);
      setPlayingAudio(identifier);
      
      // Auto-scroll to active ayah
      if (index !== -1 && ayatRefs.current[index]) {
         ayatRefs.current[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  if (loading) {
    return (
      <div className="surah-detail-loading">
        <div className="spinner"></div>
        <p>Memuat Surah...</p>
      </div>
    );
  }

  if (!surah) {
    return (
      <div className="surah-not-found">
        <h2>Surah tidak ditemukan</h2>
        <button onClick={() => navigate('/quran')} className="back-btn">
          Kembali ke Daftar Surah
        </button>
      </div>
    );
  }

  return (
    <div className="surah-detail-page fade-in">
      <button onClick={() => navigate('/quran')} className="back-btn-top">
        <ArrowLeft size={18} /> Kembali
      </button>

      <div className="surah-header-card">
        <h1 className="surah-title">{surah.namaLatin}</h1>
        <h2 className="surah-title-arabic">{surah.nama}</h2>
        <p className="surah-meaning">"{surah.arti}"</p>
        
        <div className="surah-stats">
          <span>{surah.tempatTurun}</span>
          <span className="dot">•</span>
          <span>{surah.jumlahAyat} Ayat</span>
        </div>

        <div className="audio-controls-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {surah.audioFull && surah.audioFull['05'] && (
            <button 
              className={`play-full-btn ${playingAudio === 'full' ? 'playing' : ''}`}
              onClick={() => handlePlayAudio(surah.audioFull['05'], 'full')}
            >
              {playingAudio === 'full' ? <Pause size={18} /> : <Play size={18} />}
              {playingAudio === 'full' ? 'Jeda Murottal (Full)' : 'Murottal (Full)'}
            </button>
          )}

          {surah.ayat && surah.ayat.length > 0 && surah.ayat[0].audio && surah.ayat[0].audio['05'] && (
            <button 
              className={`play-full-btn sequential-btn ${playingAudio && playingAudio.startsWith('ayat-') ? 'playing' : ''}`}
              onClick={() => handlePlayAudio(surah.ayat[0].audio['05'], `ayat-${surah.ayat[0].nomorAyat}`, 0)}
              style={{ background: playingAudio && playingAudio.startsWith('ayat-') ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)' }}
            >
              {playingAudio && playingAudio.startsWith('ayat-') ? <Pause size={18} /> : <Play size={18} />}
              {playingAudio && playingAudio.startsWith('ayat-') ? 'Jeda Ayat Berurutan' : 'Putar Per Ayat'}
            </button>
          )}
        </div>
      </div>

      <div className="ayat-list">
        {surah.ayat.map((ayat, index) => (
          <div 
            key={ayat.nomorAyat} 
            className={`ayat-card ${playingAudio === `ayat-${ayat.nomorAyat}` ? 'active-playing' : ''}`}
            ref={(el) => (ayatRefs.current[index] = el)}
          >
            <div className="ayat-header">
              <div className="ayat-number-arabic">
                <span className="arabic-number">{toArabicNumber(ayat.nomorAyat)}</span>
              </div>
              <div className="ayat-actions">
                {ayat.audio && ayat.audio['05'] && (
                  <button 
                    className="play-ayat-btn"
                    onClick={() => handlePlayAudio(ayat.audio['05'], `ayat-${ayat.nomorAyat}`, index)}
                    title="Putar Ayat"
                  >
                    {playingAudio === `ayat-${ayat.nomorAyat}` ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                )}
              </div>
            </div>
            
            <div className="ayat-content">
              <p className="ayat-arabic">{ayat.teksArab}</p>
              <div className="ayat-text-container">
                <span className="text-label latin-label">Latin:</span>
                <p className="ayat-latin">{ayat.teksLatin}</p>
              </div>
              <div className="ayat-text-container">
                <span className="text-label arti-label">Artinya:</span>
                <p className="ayat-indonesia">{ayat.teksIndonesia}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="surah-navigation">
        {surah.suratSebelumnya ? (
          <Link to={`/quran/${surah.suratSebelumnya.nomor}`} className="nav-btn prev">
            <ChevronLeft size={20} />
            <div>
              <span className="nav-label">Sebelumnya</span>
              <span className="nav-surah-name">{surah.suratSebelumnya.namaLatin}</span>
            </div>
          </Link>
        ) : (
          <div className="nav-placeholder"></div>
        )}

        {surah.suratSelanjutnya ? (
          <Link to={`/quran/${surah.suratSelanjutnya.nomor}`} className="nav-btn next">
            <div>
              <span className="nav-label">Selanjutnya</span>
              <span className="nav-surah-name">{surah.suratSelanjutnya.namaLatin}</span>
            </div>
            <ChevronRight size={20} />
          </Link>
        ) : (
          <div className="nav-placeholder"></div>
        )}
      </div>
    </div>
  );
};

export default SurahDetail;
