import { Link } from 'react-router-dom';
import { Download, ChevronRight } from 'lucide-react';
import './ProjectCard.css';

const ProjectCard = ({ project }) => {
  return (
    <div className="project-card">
      <div className="card-header">
        <span className={`category-badge badge-${project.category.toLowerCase()}`}>
          {project.category}
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
        <a href={project.downloadUrl} className="btn btn-secondary icon-btn" target="_blank" rel="noopener noreferrer">
          <Download size={16} />
        </a>
        <Link to={`/project/${project.id}`} className="btn btn-primary">
          View Details <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
};

export default ProjectCard;
