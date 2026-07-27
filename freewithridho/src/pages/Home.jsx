import { useState, useEffect, useRef } from 'react';
import { getAllProjects } from '../services/projectService';
import ProjectCard from '../components/ProjectCard';
import { Search, Code2, Users, Star, Zap } from 'lucide-react';
import './Home.css';

const CATEGORIES = ['All', 'Basic', 'Premium', 'Web', 'Game', 'Mobile'];

// Animated counter hook
function useCountUp(target, duration = 1500, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started || target === 0) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, started]);
  return count;
}

const Home = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);

  const totalProjects = projects.length;
  const freeProjects = projects.filter(p => !p.price || p.price === 0).length;

  const countProjects = useCountUp(totalProjects, 1200, statsVisible);
  const countFree = useCountUp(freeProjects, 1200, statsVisible);
  const countStar = useCountUp(49, 1000, statsVisible);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const data = await getAllProjects();
        setProjects(data);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Gagal memuat proyek. Pastikan konfigurasi Firebase sudah benar.');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Intersection Observer for stats animation
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
      || p.title.toLowerCase().includes(searchQuery.toLowerCase())
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

      {/* Stats */}
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
              <div className="stat-number">{countStar / 10}</div>
              <div className="stat-label">Rating Rata-rata</div>
            </div>
            <div className="stat-item">
              <Users size={22} className="stat-icon purple" />
              <div className="stat-number">1K+</div>
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
    </div>
  );
};

export default Home;
