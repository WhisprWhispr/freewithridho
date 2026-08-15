import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import ProjectCard from '../components/ProjectCard';
import { listenToPartnerByUserId } from '../services/partnerService';
import PartnerBadge, { getBadgeTier } from '../components/PartnerBadge';
import { User, Briefcase, ExternalLink, ShieldCheck, Star, Crown, MessageCircle, Mail, ArrowLeft } from 'lucide-react';
import './PublicProfile.css';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'ridhosandhika18022022@gmail.com';

const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [isAdminProfile, setIsAdminProfile] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    // Realtime listener for projects
    const projQ = query(collection(db, 'projects'), where('ownerId', '==', userId));
    const unsubProjects = onSnapshot(projQ, (snapshot) => {
      const projectsData = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setProjects(projectsData);
    }, (e) => {
      console.error('Failed to listen to user projects', e);
    });

    // Realtime listener for user profile
    let unsubUser;
    import('firebase/firestore').then(({ doc }) => {
      unsubUser = onSnapshot(doc(db, 'users', userId), (docSnap) => {
        if (docSnap.exists()) {
          setProfileUser(docSnap.data());
        }
      });
    });

    // Realtime listener for partner data
    const unsubPartner = listenToPartnerByUserId(userId, async (data) => {
      if (data) {
        setPartner(data);
        setIsAdminProfile(false);
        setLoading(false);
      } else {
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

    return () => {
      unsubProjects();
      if (unsubPartner) unsubPartner();
      if (unsubUser) unsubUser();
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="public-profile-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  // ── ADMIN PROFILE ──────────────────────────────────────────────
  if (isAdminProfile) {
    return (
      <div className="public-profile-page">
        <button onClick={() => navigate(-1)} className="profile-back-btn">
          <ArrowLeft size={16} /> Kembali
        </button>

        <div className="public-profile-header admin-profile-header">
          <div className="public-profile-cover admin-cover"></div>
          <div className="public-profile-info-container">
            <div className="public-profile-avatar admin-avatar-icon" style={{ overflow: 'hidden', padding: profileUser?.photoURL ? 0 : undefined, background: profileUser?.photoURL ? '#1e293b' : undefined }}>
              {profileUser?.photoURL ? (
                <img src={profileUser.photoURL} alt="Admin Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <ShieldCheck size={44} />
              )}
            </div>
            <div className="public-profile-details" style={{ flex: 1 }}>

              {/* Name + Blue Badge inline */}
              <div className="profile-name-row">
                <h1 className="public-profile-name">FREEWITHRIDHO</h1>
                <span className="admin-verified-badge">
                  <ShieldCheck size={13} /> Verified
                </span>
                <PartnerBadge tier="admin" />
              </div>

              {/* Role Badges */}
              <div className="profile-badges-row">
                <span className="admin-role-badge">
                  <Crown size={12} /> Platform Administrator
                </span>
                <span className="admin-role-badge founder">
                  <Star size={12} /> Founder &amp; Lead Developer
                </span>
              </div>

              <p className="admin-profile-bio">
                Pengelola resmi platform <strong>FREEWITHRIDHO</strong> — menyediakan source code berkualitas
                tinggi untuk semua kalangan. Berkomitmen menghadirkan proyek terbaik untuk komunitas developer Indonesia.
              </p>

              {/* Stats + CTA */}
              <div className="profile-stats-cta-row">
                <div className="public-profile-stats">
                  <div className="public-stat-box admin-stat-box">
                    <span className="public-stat-value">{projects.length}</span>
                    <span className="public-stat-label">Total Proyek</span>
                  </div>
                </div>
                <a
                  href={`mailto:${ADMIN_EMAIL}?subject=Kerjasama Proyek - FREEWITHRIDHO`}
                  className="btn-hire-me admin-btn"
                >
                  <Mail size={16} /> Hubungi Admin
                </a>
              </div>

            </div>
          </div>
        </div>

        <div className="public-profile-content">
          <h2 className="public-content-title">
            <Crown size={20} style={{ color: '#f59e0b' }} /> Koleksi Proyek Platform
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
        <User size={56} style={{ color: '#ef4444', marginBottom: '1rem' }} />
        <h2 style={{ color: '#ef4444' }}>Akun Diblokir Permanen</h2>
        <p>Profil developer ini tidak dapat diakses karena pelanggaran berat.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Beranda</Link>
      </div>
    );
  }

  if (partner && partner.status === 'suspended') {
    return (
      <div className="public-profile-page empty-state">
        <User size={56} style={{ color: '#f59e0b', marginBottom: '1rem' }} />
        <h2 style={{ color: '#f59e0b' }}>Akun Ditangguhkan</h2>
        <p>Profil developer ini sedang ditangguhkan sementara waktu.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Beranda</Link>
      </div>
    );
  }

  if (!partner || partner.status !== 'approved') {
    return (
      <div className="public-profile-page empty-state">
        <User size={56} style={{ color: '#475569', marginBottom: '1rem' }} />
        <h2>Profil Tidak Ditemukan</h2>
        <p>Developer ini tidak ditemukan atau belum disetujui sebagai partner.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Kembali ke Beranda</Link>
      </div>
    );
  }

  // ── PARTNER PROFILE ────────────────────────────────────────────
  // Fallback to balance if totalEarnings hasn't been cached by the security rules yet
  const badgeTier = getBadgeTier(partner.totalEarnings !== undefined ? partner.totalEarnings : partner.balance);

  return (
    <div className="public-profile-page">
      <button onClick={() => navigate(-1)} className="profile-back-btn">
        <ArrowLeft size={16} /> Kembali
      </button>

      <div className="public-profile-header">
        <div className="public-profile-cover"></div>
        <div className="public-profile-info-container">
          <div className="public-profile-avatar" style={{ overflow: 'hidden', padding: profileUser?.photoURL ? 0 : undefined, background: profileUser?.photoURL ? '#1e293b' : undefined }}>
            {profileUser?.photoURL ? (
              <img src={profileUser.photoURL} alt="Partner Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              partner.fullName ? partner.fullName[0].toUpperCase() : 'D'
            )}
          </div>
          <div className="public-profile-details" style={{ flex: 1 }}>

            {/* Name + Badge inline */}
            <div className="profile-name-row">
              <h1 className="public-profile-name">{partner.fullName}</h1>
              {badgeTier > 0 && <PartnerBadge tier={badgeTier} />}
            </div>

            {/* Official Partner Badge */}
            <div className="profile-badges-row">
              <span className="public-profile-badge">Partner Developer Resmi</span>
            </div>

            {/* Skills & Portfolio */}
            <div className="public-profile-meta">
              {partner.skills && (
                <div className="public-meta-item">
                  <Briefcase size={15} />
                  <span>{partner.skills}</span>
                </div>
              )}
              {partner.portfolio && (
                <a href={partner.portfolio} target="_blank" rel="noopener noreferrer" className="public-meta-item link">
                  <ExternalLink size={15} />
                  <span>Portofolio</span>
                </a>
              )}
            </div>

            {/* Stats + CTA */}
            <div className="profile-stats-cta-row">
              <div className="public-profile-stats">
                <div className="public-stat-box">
                  <span className="public-stat-value">{projects.length}</span>
                  <span className="public-stat-label">Proyek</span>
                </div>
              </div>
              {partner.phone && (
                <a
                  href={`https://wa.me/${partner.phone.replace(/[^0-9]/g, '').startsWith('0') ? '62' + partner.phone.replace(/[^0-9]/g, '').slice(1) : partner.phone.replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(partner.fullName)}%2C%20saya%20melihat%20profil%20Anda%20di%20FREEWITHRIDHO%20dan%20tertarik%20untuk%20bekerjasama%20dalam%20proyek...`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-hire-me"
                >
                  <MessageCircle size={16} /> Hire Me (WhatsApp)
                </a>
              )}
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
