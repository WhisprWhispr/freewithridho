import { useState, useEffect } from 'react';
import { getAllProjects } from '../services/projectService';
import ProjectCard from '../components/ProjectCard';
import './Home.css';

const CATEGORIES = ['All', 'Basic', 'Premium', 'Web', 'Game', 'Mobile'];

const Home = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const filteredProjects = activeCategory === 'All'
    ? projects
    : projects.filter(p => p.category === activeCategory);

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <div className="badge-glow">Premium &amp; Free</div>
          <h1 className="hero-title">
            Source Code <br />
            <span className="text-gradient">For Everyone</span>
          </h1>
          <p className="hero-subtitle">
            Discover and download high-quality, premium source code projects for absolutely free. Build your next big idea faster.
          </p>
        </div>
      </section>

      <section className="projects-section">
        <div className="section-header">
          <h2>Latest Projects</h2>
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
            <p>Belum ada proyek untuk kategori ini.</p>
            <p>Upload proyek pertama melalui <a href="/admin">Admin Panel</a>.</p>
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
