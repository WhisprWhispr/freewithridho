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
        {project.developerName && (
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '16px', height: '16px', background: '#3b82f6', borderRadius: '50%', color: 'white', textAlign: 'center', lineHeight: '16px', fontSize: '0.6rem' }}>{project.developerName[0].toUpperCase()}</span>
            {project.developerName}
          </p>
        )}
        <p className="card-description">{project.description}</p>
      </div>

      <div className="card-footer">
        {/* Wishlist button */}
        <button
          className={`card-wishlist-btn ${wishlisted ? 'active' : ''}`}
          onClick={handleWishlist}
          title={wishlisted ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
        >
          <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
        </button>

        <Link to={`/project/${project.id}`} className="btn btn-primary card-detail-btn">
          Lihat Detail <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
};

export default ProjectCard;
