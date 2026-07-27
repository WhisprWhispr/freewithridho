import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import ProjectCard from '../components/ProjectCard';
import { listenToPartnerByUserId } from '../services/partnerService';
import { User, Briefcase, ExternalLink } from 'lucide-react';
import './PublicProfile.css';

const PublicProfile = () => {
  const { userId } = useParams();
  const [partner, setPartner] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    // 1. Listen to partner info
    const unsubscribe = listenToPartnerByUserId(userId, (data) => {
      setPartner(data);
      setLoading(false); // We stop loading when partner data comes
    });

    // 2. Fetch partner's projects
    const fetchProjects = async () => {
      try {
        const q = query(collection(db, 'projects'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProjects(projectsData);
      } catch (e) {
        console.error("Failed to load user projects", e);
      }
    };

    fetchProjects();

    return () => {
      if(unsubscribe) unsubscribe();
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="public-profile-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  // If user is not an approved partner
  if (!partner || partner.status !== 'approved') {
    return (
      <div className="public-profile-page empty-state">
        <User size={64} style={{ color: '#475569', marginBottom: '1rem' }} />
        <h2>Profil Tidak Ditemukan</h2>
        <p>Developer ini tidak ditemukan atau belum disetujui sebagai partner.</p>
        <Link to="/" className="btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Beranda</Link>
      </div>
    );
  }

  return (
    <div className="public-profile-page">
      {/* Cover / Header Section */}
      <div className="public-profile-header">
        <div className="public-profile-cover"></div>
        <div className="public-profile-info-container">
          <div className="public-profile-avatar">
            {partner.fullName ? partner.fullName[0].toUpperCase() : 'D'}
          </div>
          <div className="public-profile-details">
            <h1 className="public-profile-name">{partner.fullName}</h1>
            <p className="public-profile-badge">Partner Developer Resmi</p>
            
            <div className="public-profile-meta">
              {partner.skills && (
                <div className="public-meta-item">
                  <Briefcase size={16} />
                  <span>{partner.skills}</span>
                </div>
              )}
              {partner.portfolio && (
                <a href={partner.portfolio} target="_blank" rel="noopener noreferrer" className="public-meta-item link">
                  <ExternalLink size={16} />
                  <span>Portofolio</span>
                </a>
              )}
            </div>
          </div>
          
          <div className="public-profile-stats">
            <div className="public-stat-box">
              <span className="public-stat-value">{projects.length}</span>
              <span className="public-stat-label">Proyek</span>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid Section */}
      <div className="public-profile-content">
        <h2 className="public-content-title">Karya {partner.fullName}</h2>
        {projects.length === 0 ? (
          <div className="public-empty-projects">
            <p>Developer ini belum mengunggah proyek apapun.</p>
          </div>
        ) : (
          <div className="public-projects-grid">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
