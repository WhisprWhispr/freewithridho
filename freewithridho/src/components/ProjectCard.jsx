import { Link } from 'react-router-dom';
import { Download, ChevronRight, Heart, Eye } from 'lucide-react';
import { isWishlisted, toggleWishlist } from '../services/wishlistService';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import './ProjectCard.css';

const ProjectCard = ({ project }) => {
  const [wishlisted, setWishlisted] = useState(isWishlisted(project.id));

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const now = toggleWishlist(project.id);
    setWishlisted(now);
    if (now) {
      toast.success('❤️ Ditambahkan ke Favorit!');
    } else {
      toast('💔 Dihapus dari Favorit', { icon: null });
    }
  };

  return (
    <div className="project-card">
      <div className="card-header">
        <span className={`category-badge badge-${project.category ? project.category.toLowerCase() : 'all'}`}>
          {project.category || 'Uncategorized'}
        </span>
        <span className={`price-badge ${project.price > 0 ? 'paid' : 'free'}`}>
          {project.price > 0 ? `Rp ${project.price.toLocaleString('id-ID')}` : 'Gratis'}
        </span>
      </div>

      {project.images && project.images[0] && (
        <div className="card-thumbnail">
          <img src={project.images[0]} alt={project.title} loading="lazy" />
        </div>
      )}

      <div className="card-body">
        <h3 className="card-title">{project.title}</h3>
        <p className="card-description">{project.description}</p>
      </div>

      <div className="card-footer">
        <div className="footer-left">
          {project.developerName ? (
            <Link to={`/user/${project.userId}`} className="card-developer" title={`Lihat Profil Developer: ${project.developerName}`} style={{ textDecoration: 'none' }}>
              <div className="dev-avatar">
                {project.developerName[0].toUpperCase()}
              </div>
              <span className="dev-name">{project.developerName}</span>
            </Link>
          ) : (
            <div className="card-developer empty" />
          )}
        </div>

        <div className="footer-actions">
          <button
            className={`card-wishlist-btn ${wishlisted ? 'active' : ''}`}
            onClick={handleWishlist}
            title={wishlisted ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
          >
            <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>

          <Link to={`/project/${project.id}`} className="btn btn-primary card-detail-btn">
            Detail <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
