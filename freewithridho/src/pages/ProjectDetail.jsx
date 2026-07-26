import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Download, ArrowLeft, FileText, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getProjectById } from '../services/projectService';
import './ProjectDetail.css';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleBuy = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate(`/checkout/${id}`);
    }
  };

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const data = await getProjectById(id);
        if (!data) setError('Proyek tidak ditemukan.');
        else setProject(data);
      } catch (err) {
        console.error(err);
        setError('Gagal memuat data proyek.');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="spinner-large"></div>
        <p>Memuat proyek...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="not-found">
        <h2>{error || 'Proyek tidak ditemukan.'}</h2>
        <Link to="/" className="btn btn-secondary">Kembali ke Home</Link>
      </div>
    );
  }

  return (
    <div className="project-detail-page">
      <div className="detail-header">
        <div className="header-content">
          <Link to="/" className="back-link">
            <ArrowLeft size={20} /> Kembali ke Proyek
          </Link>
          <div className="title-row">
            <h1>{project.title}</h1>
            <span className={`category-badge badge-${project.category.toLowerCase()}`}>
              {project.category}
            </span>
          </div>
          <p className="detail-description">{project.description}</p>
          
          <div className="detail-action">
            {project.price > 0 ? (
              <button onClick={handleBuy} className="btn btn-primary buy-btn">
                <ShoppingCart size={20} /> Beli Rp {project.price.toLocaleString('id-ID')}
              </button>
            ) : (
              <a
                href={project.downloadUrl}
                className="btn btn-primary download-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={20} /> Download Gratis
              </a>
            )}
          </div>
        </div>
      </div>

      {project.images && project.images.filter(img => img.trim() !== '').length > 0 && (
        <div className="project-gallery">
          {project.images.filter(img => img.trim() !== '').map((imgUrl, index) => (
            <div key={index} className="gallery-item">
              <img src={imgUrl} alt={`Screenshot ${index + 1}`} loading="lazy" />
            </div>
          ))}
        </div>
      )}

      {project.readme ? (
        <div className="readme-container">
          <div className="readme-header">
            <FileText size={16} />
            <span>README.md</span>
          </div>
          <div className="markdown-body">
            <ReactMarkdown>{project.readme}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="no-readme">
          <p>Tidak ada README.md untuk proyek ini.</p>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
