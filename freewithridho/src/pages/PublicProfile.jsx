import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import ProjectCard from '../components/ProjectCard';
import { listenToPartnerByUserId } from '../services/partnerService';
import { User, Briefcase, ExternalLink, ShieldCheck, Star, Crown } from 'lucide-react';
import './PublicProfile.css';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'ridhosandhika18022022@gmail.com';

const PublicProfile = () => {
  const { userId } = useParams();
  const [partner, setPartner] = useState(null);
  const [isAdminProfile, setIsAdminProfile] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    // 1. Fetch projects for this user first (always)
    const fetchProjects = async () => {
      try {
        const q = query(collection(db, 'projects'), where('ownerId', '==', userId));
        const snapshot = await getDocs(q);
        const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProjects(projectsData);
      } catch (e) {
        console.error('Failed to load user projects', e);
      }
    };

    // 2. Check if userId belongs to admin by matching with projects that have developerName 'Admin'
    //    OR listen to partner - if no partner found, could be admin
    const unsubscribe = listenToPartnerByUserId(userId, async (data) => {
      if (data) {
        setPartner(data);
        setIsAdminProfile(false);
        setLoading(false);
      } else {
        // No partner found — check if this is admin by looking at their projects
        try {
          const q = query(
            collection(db, 'projects'),
            where('ownerId', '==', userId),
            where('developerName', '==', 'Admin')
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            setIsAdminProfile(true);
          }
        } catch (e) {
          console.error(e);
        }
        setLoading(false);
      }
    });

    fetchProjects();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="public-profile-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  // ── ADMIN PROFILE ──────────────────────────────────────────────
  if (isAdminProfile) {
    return (
      <div className="public-profile-page">
        <div className="public-profile-header admin-profile-header">
          <div className="public-profile-cover admin-cover"></div>
          <div className="public-profile-info-container">
            <div className="public-profile-avatar admin-avatar-icon">
              <ShieldCheck size={52} />
            </div>
            <div className="public-profile-details">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 className="public-profile-name">FREEWITHRIDHO</h1>
                <span className="admin-verified-badge">
                  <ShieldCheck size={14} /> Verified
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <span className="admin-role-badge">
                  <Crown size={13} /> Platform Administrator
                </span>
                <span className="admin-role-badge founder">
                  <Star size={13} /> Founder &amp; Lead Developer
                </span>
              </div>
              <p className="admin-profile-bio">
                Pengelola resmi platform <strong>FREEWITHRIDHO</strong> — menyediakan source code berkualitas 
                tinggi untuk semua kalangan. Berkomitmen menghadirkan proyek terbaik untuk komunitas developer Indonesia.
              </p>
            </div>

            <div className="public-profile-stats">
              <div className="public-stat-box admin-stat-box">
                <span className="public-stat-value">{projects.length}</span>
                <span className="public-stat-label">Total Proyek</span>
              </div>
            </div>
          </div>
        </div>

        <div className="public-profile-content">
          <h2 className="public-content-title">
            <Crown size={22} style={{ color: '#f59e0b' }} /> Koleksi Proyek Platform
          </h2>
          {projects.length === 0 ? (
            <div className="public-empty-projects">
              <p>Belum ada proyek yang diunggah.</p>
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
  }

  // ── BLOCKED/SUSPENDED STATES ────────────────────────────────────
  if (partner && partner.status === 'banned') {
    return (
      <div className="public-profile-page empty-state">
        <User size={64} style={{ color: '#ef4444', marginBottom: '1rem' }} />
        <h2 style={{ color: '#ef4444' }}>Akun Diblokir Permanen</h2>
        <p>Profil developer ini tidak dapat diakses karena pelanggaran berat.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Beranda</Link>
      </div>
    );
  }

  if (partner && partner.status === 'suspended') {
    return (
      <div className="public-profile-page empty-state">
        <User size={64} style={{ color: '#f59e0b', marginBottom: '1rem' }} />
        <h2 style={{ color: '#f59e0b' }}>Akun Ditangguhkan</h2>
        <p>Profil developer ini sedang ditangguhkan sementara waktu.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Beranda</Link>
      </div>
    );
  }

  // ── PARTNER NOT FOUND ──────────────────────────────────────────
  if (!partner || partner.status !== 'approved') {
    return (
      <div className="public-profile-page empty-state">
        <User size={64} style={{ color: '#475569', marginBottom: '1rem' }} />
        <h2>Profil Tidak Ditemukan</h2>
        <p>Developer ini tidak ditemukan atau belum disetujui sebagai partner.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Beranda</Link>
      </div>
    );
  }

  // ── PARTNER PROFILE ────────────────────────────────────────────
  return (
    <div className="public-profile-page">
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
