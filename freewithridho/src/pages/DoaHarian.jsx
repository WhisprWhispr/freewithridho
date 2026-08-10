import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './DoaHarian.css';

const DoaHarian = () => {
  const navigate = useNavigate();
  const [doas, setDoas] = useState([]);
  const [categories, setCategories] = useState(["Semua"]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const fetchDoas = async () => {
      try {
        const res = await fetch('/data/doas.json');
        if (!res.ok) throw new Error('Failed to fetch data');
        const data = await res.json();
        setDoas(data);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(data.map(item => item.category))];
        setCategories(["Semua", ...uniqueCategories]);
      } catch (err) {
        console.error('Error fetching doas:', err);
        toast.error('Gagal memuat data doa');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDoas();
  }, []);



  const handleCopy = (doa) => {
    const textToCopy = `${doa.title}\n\n${doa.arabic}\n\n${doa.latin}\n\nArtinya: ${doa.translation}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(doa.id);
    toast.success('Doa berhasil disalin!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDoa = doas.filter(doa => {
    const matchCategory = activeCategory === "Semua" || doa.category === activeCategory;
    const matchSearch = doa.title.toLowerCase().includes(search.toLowerCase()) || 
                        doa.translation.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="doa-page fade-in">
      <div className="doa-nav">
        <button onClick={() => navigate('/jadwal-sholat')} className="back-btn-top">
          <ArrowLeft size={18} /> Dashboard
        </button>
      </div>

      <div className="doa-header">
        <h1>Doa Harian</h1>
        <p>Kumpulan doa sehari-hari untuk diamalkan</p>
        
        <div className="doa-search">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Cari doa (contoh: makan, tidur...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="doa-categories">
          {categories.map(cat => (
            <button 
              key={cat} 
              className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="doa-list">
        {loading ? (
          <div className="loading-state" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <p>Memuat 500 kumpulan doa...</p>
          </div>
        ) : filteredDoa.length > 0 ? (
          filteredDoa.map((doa) => (
            <div key={doa.id} className="doa-card">
              <div className="doa-card-header">
                <span className="doa-category-tag">{doa.category}</span>
                <button 
                  className="copy-btn" 
                  onClick={() => handleCopy(doa)}
                  title="Salin Doa"
                >
                  {copiedId === doa.id ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
              </div>
              <h3 className="doa-title">{doa.title}</h3>
              <p className="doa-arabic">{doa.arabic}</p>
              <p className="doa-latin">{doa.latin}</p>
              <div className="doa-translation-container">
                <span className="translation-label">Artinya:</span>
                <p className="doa-translation">{doa.translation}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="no-doa">
            <p>Doa tidak ditemukan.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoaHarian;
