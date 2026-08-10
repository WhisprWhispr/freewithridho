import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Book, MapPin, Hash, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import './Quran.css';

const Quran = () => {
  const navigate = useNavigate();
  const [surahs, setSurahs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const response = await fetch('https://equran.id/api/v2/surat');
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        setSurahs(data.data);
      } catch (error) {
        console.error('Error fetching surahs:', error);
        toast.error('Gagal memuat daftar Surah');
      } finally {
        setLoading(false);
      }
    };

    fetchSurahs();
  }, []);

  const filteredSurahs = surahs.filter((surah) =>
    surah.namaLatin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surah.arti.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="quran-page fade-in">
      <div className="quran-nav" style={{ padding: '1rem 2rem' }}>
        <button onClick={() => navigate('/jadwal-sholat')} className="back-btn-top">
          <ArrowLeft size={18} /> Dashboard
        </button>
      </div>
      <div className="quran-header">
        <div className="quran-header-content">
          <h1>Al-Quran Digital</h1>
          <p>Baca Al-Quran dan Terjemahannya Kapan Saja, Di Mana Saja</p>
          
          <div className="search-container">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Cari Surah (contoh: Al-Kahfi, Yasin...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="surah-search-input"
            />
          </div>
        </div>
      </div>

      <div className="quran-content">
        {loading ? (
          <div className="quran-loading">
            <div className="spinner"></div>
            <p>Memuat daftar Surah...</p>
          </div>
        ) : (
          <div className="surah-grid">
            {filteredSurahs.map((surah) => (
              <Link to={`/quran/${surah.nomor}`} key={surah.nomor} className="surah-card">
                <div className="surah-number">
                  <div className="number-hex">
                    <span>{surah.nomor}</span>
                  </div>
                </div>
                
                <div className="surah-info">
                  <h3 className="surah-name">{surah.namaLatin}</h3>
                  <p className="surah-arti">{surah.arti}</p>
                </div>

                <div className="surah-arabic">
                  {surah.nama}
                </div>

                <div className="surah-meta">
                  <span className="meta-item">
                    <MapPin size={12} /> {surah.tempatTurun}
                  </span>
                  <span className="meta-item">
                    <Hash size={12} /> {surah.jumlahAyat} Ayat
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        
        {!loading && filteredSurahs.length === 0 && (
          <div className="no-results">
            <Book size={48} className="no-results-icon" />
            <h3>Surah Tidak Ditemukan</h3>
            <p>Pencarian "{searchQuery}" tidak membuahkan hasil.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quran;
