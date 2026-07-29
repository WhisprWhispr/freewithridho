import { useState, useEffect, useRef } from 'react';
import { listenToProjects } from '../services/projectService';
import { listenToAvgRating, submitRating } from '../services/ratingService';
import { listenToApprovedDevCount } from '../services/partnerService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import ProjectCard from '../components/ProjectCard';
import { Search, Code2, Users, Star, Zap, Clock } from 'lucide-react';
import './Home.css';

const CATEGORIES = ['All', 'Basic', 'Premium', 'Web', 'Game', 'Mobile'];

// Countdown Timer Hook — hitung mundur ke tengah malam
function useFlashSaleCountdown() {
  const getTimeLeft = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = Math.max(0, midnight - now);
    return {
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  };
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, []);
  return timeLeft;
}

// Animated counter — re-triggers on target change
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

const Home = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [avgRating, setAvgRating] = useState(4.9);
  const [devCount, setDevCount] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [showAllFlashSale, setShowAllFlashSale] = useState(false);
  const statsRef = useRef(null);
  const flashCountdown = useFlashSaleCountdown();

  // Derived real-time stats
  const totalProjects = projects.length;
  const freeProjects = projects.filter(p => !p.price || p.price === 0).length;
  const flashSaleProjects = projects.filter(p => p.isFlashSale && p.discountPrice);

  const countProjects = useCountUp(statsVisible ? totalProjects : 0);
  const countFree    = useCountUp(statsVisible ? freeProjects : 0);
  const countDevs    = useCountUp(statsVisible ? devCount : 0);
  const displayRating = avgRating.toFixed(1);

  // ── Real-time Firestore listener ──────────────────────────────
  useEffect(() => {
    setLoading(true);
    const unsubscribeProjects = listenToProjects((data) => {
      setProjects(data);
      setLoading(false);
      setError(null);
    });
    
    const unsubscribeRating = listenToAvgRating(({ average }) => {
      setAvgRating(average);
    });

    const unsubscribeDevs = listenToApprovedDevCount((count) => {
      setDevCount(count);
    });

    return () => {
      if (typeof unsubscribeProjects === 'function') unsubscribeProjects();
      if (typeof unsubscribeRating === 'function') unsubscribeRating();
      if (typeof unsubscribeDevs === 'function') unsubscribeDevs();
    };
  }, []);

  // Timeout fallback for slow connections
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setError('Koneksi membutuhkan waktu lebih lama. Coba refresh halaman.');
    }, 10000);
    return () => clearTimeout(timer);
  }, [loading]);

  // Intersection Observer — animate counters when stats section visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [loading]);

  const filteredProjects = projects.filter(p => {
    const matchCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = !searchQuery
      || p.title?.toLowerCase().includes(searchQuery.toLowerCase())
      || p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      || p.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <div className="badge-glow">
            <Zap size={12} /> Premium &amp; Free
          </div>
          <h1 className="hero-title">
            Source Code <br />
            <span className="text-gradient">For Everyone</span>
          </h1>
          <p className="hero-subtitle">
            Temukan dan download source code berkualitas tinggi untuk membangun proyek impianmu.
            Siap pakai, terdokumentasi, dan teruji.
          </p>

          {/* Search Bar */}
          <div className="hero-search">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Cari proyek, teknologi, kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>
        </div>
      </section>

      {/* Flash Sale Banner */}
      {!loading && flashSaleProjects.length > 0 && (
        <section className="flash-sale-section">
          {/* Header */}
          <div className="flash-sale-header">
            <div className="flash-sale-title">
              <div className="flash-icon-wrap">
                <Zap size={20} className="flash-icon" />
              </div>
              <div>
                <h2>⚡ Flash Sale</h2>
                <p className="flash-sale-subtitle">Penawaran terbatas, jangan sampai terlewat!</p>
              </div>
              <span className="flash-badge">🔥 HOT</span>
            </div>

            <div className="flash-countdown">
              <div className="flash-countdown-label">
                <Clock size={14} />
                <span>Berakhir dalam</span>
              </div>
              <div className="countdown-blocks">
                <div className="countdown-block">
                  <span>{String(flashCountdown.hours).padStart(2, '0')}</span>
                  <small>JAM</small>
                </div>
                <div className="countdown-sep">:</div>
                <div className="countdown-block">
                  <span>{String(flashCountdown.minutes).padStart(2, '0')}</span>
                  <small>MNT</small>
                </div>
                <div className="countdown-sep">:</div>
                <div className="countdown-block">
                  <span>{String(flashCountdown.seconds).padStart(2, '0')}</span>
                  <small>DTK</small>
                </div>
              </div>
            </div>
          </div>

          {/* Flash Sale Items */}
          <div className="flash-sale-grid">
            {(showAllFlashSale ? flashSaleProjects : flashSaleProjects.slice(0, 3)).map(project => (
              <div key={project.id} className="flash-sale-card-wrap">
                <div className="flash-sale-discount-badge">
                  -{Math.round(((project.price - project.discountPrice) / project.price) * 100)}%
                </div>
                <ProjectCard project={project} isFlashSale />
              </div>
            ))}
          </div>
          {flashSaleProjects.length > 3 && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button 
                onClick={() => setShowAllFlashSale(!showAllFlashSale)}
                className="btn-see-all-flash"
              >
                {showAllFlashSale ? 'Tampilkan Lebih Sedikit' : `Lihat Semua Diskon (${flashSaleProjects.length})`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Stats — real-time from Firestore */}
      {!loading && (
        <section className="stats-section" ref={statsRef}>
          <div className="stats-grid">
            <div className="stat-item">
              <Code2 size={22} className="stat-icon blue" />
              <div className="stat-number">{countProjects}+</div>
              <div className="stat-label">Total Proyek</div>
            </div>
            <div className="stat-item">
              <Zap size={22} className="stat-icon green" />
              <div className="stat-number">{countFree}+</div>
              <div className="stat-label">Proyek Gratis</div>
            </div>
            <div className="stat-item">
              <Star size={22} className="stat-icon yellow" />
              <div className="stat-number">{displayRating}</div>
              <div className="stat-label">Rating Rata-rata</div>
            </div>
            <div className="stat-item">
              <Users size={22} className="stat-icon purple" />
              <div className="stat-number">{countDevs > 1000 ? `${(countDevs/1000).toFixed(1).replace('.0', '')}K+` : countDevs}</div>
              <div className="stat-label">Developer</div>
            </div>
          </div>
        </section>
      )}

      <section className="projects-section">
        <div className="section-header">
          <h2>
            {searchQuery ? `Hasil pencarian "${searchQuery}"` : 'Latest Projects'}
            {filteredProjects.length > 0 && (
              <span className="result-count">{filteredProjects.length} proyek</span>
            )}
          </h2>
          <div className="category-filters">
            {CATEGORIES.map(category => (
              <button
                key={category}
                className={`filter-btn ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Memuat proyek...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>⚠️ {error}</p>
          </div>
        )}

        {!loading && !error && filteredProjects.length === 0 && (
          <div className="empty-state">
            {searchQuery ? (
              <>
                <Search size={40} style={{ color: '#334155' }} />
                <p>Tidak ada proyek yang cocok dengan "<strong>{searchQuery}</strong>"</p>
                <button className="btn-clear-search" onClick={() => setSearchQuery('')}>Hapus pencarian</button>
              </>
            ) : (
              <>
                <p>Belum ada proyek untuk kategori ini.</p>
                <p>Coba pilih kategori lain atau cari dengan kata kunci berbeda.</p>
              </>
            )}
          </div>
        )}

        {!loading && !error && filteredProjects.length > 0 && (
          <div className="projects-grid">
            {filteredProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      {/* RATING WIDGET */}
      <RatingWidget />
    </div>
  );
};

// ── Rating Widget Component ──────────────────────────────────
const RatingWidget = () => {
  const { user } = useAuth();
  const [hovered, setHovered] = useState(0);
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRate = async (star) => {
    if (!user) {
      toast.error('Silakan login untuk memberikan rating.');
      return;
    }
    setRating(star);
    try {
      setIsSubmitting(true);
      await submitRating(user.uid, star);
      toast.success('Terima kasih atas rating Anda!');
    } catch (err) {
      toast.error('Gagal mengirim rating.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rating-section" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h3 style={{ marginBottom: '1rem', color: '#f8fafc' }}>Beri nilai untuk website kami</h3>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={isSubmitting}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: (hovered || rating) >= star ? '#fbbf24' : '#334155',
              transition: 'color 0.2s'
            }}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => handleRate(star)}
          >
            <Star size={32} fill={(hovered || rating) >= star ? '#fbbf24' : 'transparent'} />
          </button>
        ))}
      </div>
      {!user && <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#94a3b8' }}>Login untuk memberi rating</p>}
    </section>
  );
};

export default Home;
