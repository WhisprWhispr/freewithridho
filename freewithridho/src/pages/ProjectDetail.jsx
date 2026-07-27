import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Download, ArrowLeft, FileText, ShoppingCart, LockOpen, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getProjectById, checkUserPurchase } from '../services/projectService';
import './ProjectDetail.css';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);

  const handleBuy = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate(`/checkout/${id}`);
    }
  };

  const handleFreeDownload = (e) => {
    e.preventDefault();
    setShowAdModal(true);
  };

  const proceedToDownload = () => {
    setShowAdModal(false);
    window.open(project.downloadUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const fetchProjectAndPurchaseStatus = async () => {
      try {
        setLoading(true);
        const data = await getProjectById(id);
        if (!data) {
          setError('Proyek tidak ditemukan.');
          return;
        }
        setProject(data);

        // Cek status pembelian jika berbayar dan user login
        if (data.price > 0 && user) {
          const purchased = await checkUserPurchase(user.uid, id);
          setHasPurchased(purchased);
        }
      } catch (err) {
        console.error(err);
        setError('Gagal memuat data proyek.');
      } finally {
        setLoading(false);
      }
    };
    fetchProjectAndPurchaseStatus();
  }, [id, user]);

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
      {/* Ad Modal */}
      {showAdModal && (
        <div className="ad-modal-overlay">
          <div className="ad-modal-content">
            <div className="ad-modal-icon">
              <Heart size={40} className="pulse-animation" />
            </div>
            <h2>Dukung Developer 🚀</h2>
            <p>
              Aplikasi/source code ini disediakan secara gratis. Untuk membantu developer terus berkarya, 
              Anda akan diarahkan melewati halaman iklan singkat sebelum masuk ke link unduhan. 
              Terima kasih atas dukungan Anda!
            </p>
            <div className="ad-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={proceedToDownload}>Lanjutkan ke Unduhan</button>
            </div>
          </div>
        </div>
      )}

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
              hasPurchased ? (
                <a
                  href={project.downloadUrl}
                  className="btn btn-success download-btn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LockOpen size={20} /> Download File Premium
                </a>
              ) : (
                <button onClick={handleBuy} className="btn btn-primary buy-btn">
                  <ShoppingCart size={20} /> Beli Rp {project.price.toLocaleString('id-ID')}
                </button>
              )
            ) : (
              <button
                onClick={handleFreeDownload}
                className="btn btn-primary download-btn"
              >
                <Download size={20} /> Download Gratis
              </button>
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
