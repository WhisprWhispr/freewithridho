import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import {
  Download, ArrowLeft, FileText, ShoppingCart, LockOpen,
  Heart, Tag, Star, ZoomIn, X, ChevronLeft, ChevronRight,
  Shield, Zap, Package, User
} from 'lucide-react';
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
  const [lightbox, setLightbox] = useState({ open: false, index: 0 });

  const handleBuy = () => {
    if (!user) navigate('/login');
    else navigate(`/checkout/${id}`);
  };

  const handleFreeDownload = (e) => {
    e.preventDefault();
    setShowAdModal(true);
  };

  const proceedToDownload = () => {
    setShowAdModal(false);
    window.open(project.downloadUrl, '_blank', 'noopener,noreferrer');
  };

  // Lightbox navigation
  const openLightbox = (index) => setLightbox({ open: true, index });
  const closeLightbox = () => setLightbox({ open: false, index: 0 });
  const prevImage = useCallback(() => {
    const imgs = project.images.filter(i => i.trim() !== '');
    setLightbox(prev => ({ ...prev, index: (prev.index - 1 + imgs.length) % imgs.length }));
  }, [project]);
  const nextImage = useCallback(() => {
    const imgs = project.images.filter(i => i.trim() !== '');
    setLightbox(prev => ({ ...prev, index: (prev.index + 1) % imgs.length }));
  }, [project]);

  // Close lightbox on ESC
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft' && lightbox.open) prevImage();
      if (e.key === 'ArrowRight' && lightbox.open) nextImage();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox.open, prevImage, nextImage]);

  useEffect(() => {
    const fetchProjectAndPurchaseStatus = async () => {
      try {
        setLoading(true);
        const data = await getProjectById(id);
        if (!data) { setError('Proyek tidak ditemukan.'); return; }
        setProject(data);
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
        <div className="detail-spinner" />
        <p>Memuat proyek...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="detail-not-found">
        <Package size={56} />
        <h2>{error || 'Proyek tidak ditemukan.'}</h2>
        <Link to="/" className="btn btn-primary">← Kembali ke Home</Link>
      </div>
    );
  }

  const images = project.images?.filter(img => img.trim() !== '') || [];
  const isFree = !project.price || project.price === 0;

  return (
    <div className="detail-page">
      {/* Ambient background glows */}
      <div className="detail-glow detail-glow-1" />
      <div className="detail-glow detail-glow-2" />

      {/* ─── Ad Modal ─────────────────────────────────────── */}
      {showAdModal && (
        <div className="ad-modal-overlay" onClick={() => setShowAdModal(false)}>
          <div className="ad-modal-content" onClick={e => e.stopPropagation()}>
            <button className="ad-modal-close" onClick={() => setShowAdModal(false)}>
              <X size={18} />
            </button>
            <div className="ad-modal-icon">
              <Heart size={36} className="pulse-animation" />
            </div>
            <h2>Dukung Developer 🚀</h2>
            <p>
              Source code ini kami bagikan secara <strong>100% gratis</strong>.
              Untuk membantu kami terus berkarya, Anda akan melewati halaman
              iklan singkat sebelum ke link unduhan. Terima kasih atas dukungannya! ❤️
            </p>
            <div className="ad-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdModal(false)}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={proceedToDownload}>
                <Download size={16} /> Lanjutkan ke Unduhan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Lightbox ─────────────────────────────────────── */}
      {lightbox.open && images.length > 0 && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox}><X size={20} /></button>
          {images.length > 1 && (
            <>
              <button className="lightbox-nav prev" onClick={e => { e.stopPropagation(); prevImage(); }}>
                <ChevronLeft size={28} />
              </button>
              <button className="lightbox-nav next" onClick={e => { e.stopPropagation(); nextImage(); }}>
                <ChevronRight size={28} />
              </button>
            </>
          )}
          <img
            src={images[lightbox.index]}
            alt={`Screenshot ${lightbox.index + 1}`}
            className="lightbox-img"
            onClick={e => e.stopPropagation()}
          />
          <div className="lightbox-counter">{lightbox.index + 1} / {images.length}</div>
        </div>
      )}

      <div className="detail-container">
        {/* ─── Back ─────────────────────────────────────────── */}
        <Link to="/" className="detail-back">
          <ArrowLeft size={16} /> Kembali
        </Link>

        {/* ─── Main Content Grid ─────────────────────────────── */}
        <div className="detail-grid">

          {/* Left: Info Column */}
          <div className="detail-info-col">
            {/* Badges */}
            <div className="detail-badges">
              <span className={`category-badge badge-${project.category?.toLowerCase()}`}>
                <Tag size={11} /> {project.category}
              </span>
              <span className={`price-type-badge ${isFree ? 'free' : 'paid'}`}>
                {isFree ? '✦ Gratis' : '★ Premium'}
              </span>
            </div>

            {/* Title */}
            <h1 className="detail-title">{project.title}</h1>

            {/* Description */}
            <p className="detail-desc">{project.description}</p>

            {/* Price Box */}
            <div className="detail-price-box">
              <div className="price-left">
                {isFree ? (
                  <>
                    <span className="price-label">Harga</span>
                    <span className="price-value free-price">Gratis</span>
                  </>
                ) : (
                  <>
                    <span className="price-label">Harga</span>
                    <span className="price-value paid-price">
                      Rp {project.price.toLocaleString('id-ID')}
                    </span>
                  </>
                )}
              </div>
              <div className="price-action">
                {isFree ? (
                  <button onClick={handleFreeDownload} className="btn btn-primary action-btn">
                    <Download size={18} /> Download Gratis
                  </button>
                ) : hasPurchased ? (
                  <a
                    href={project.downloadUrl}
                    className="btn btn-success action-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LockOpen size={18} /> Download File Premium
                  </a>
                ) : (
                  <button onClick={handleBuy} className="btn btn-primary action-btn">
                    <ShoppingCart size={18} /> Beli Sekarang
                  </button>
                )}
              </div>
            </div>

            {/* Feature list */}
            <div className="detail-features">
              <div className="feature-item">
                <div className="feature-icon"><Zap size={16} /></div>
                <div>
                  <div className="feature-title">Akses Instan</div>
                  <div className="feature-sub">Download setelah {isFree ? 'iklan' : 'pembayaran'}</div>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><Shield size={16} /></div>
                <div>
                  <div className="feature-title">Aman & Terpercaya</div>
                  <div className="feature-sub">Pembayaran via Midtrans</div>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><Star size={16} /></div>
                <div>
                  <div className="feature-title">Kualitas Terverifikasi</div>
                  <div className="feature-sub">Source code teruji</div>
                </div>
              </div>
              {!user && (
                <div className="feature-item login-prompt">
                  <div className="feature-icon user-icon"><User size={16} /></div>
                  <div>
                    <div className="feature-title">Perlu akun?</div>
                    <div className="feature-sub">
                      <Link to="/login">Login</Link> atau <Link to="/register">Daftar</Link> untuk membeli
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Main Image */}
          <div className="detail-image-col">
            {images.length > 0 ? (
              <div className="detail-main-image-wrap" onClick={() => openLightbox(0)}>
                <img
                  src={images[0]}
                  alt={project.title}
                  className="detail-main-image"
                />
                <div className="detail-image-overlay">
                  <ZoomIn size={28} />
                  <span>Klik untuk memperbesar</span>
                </div>
              </div>
            ) : (
              <div className="detail-no-image">
                <Package size={52} />
                <p>Tidak ada gambar preview</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Gallery ──────────────────────────────────────── */}
        {images.length > 1 && (
          <div className="detail-section">
            <h2 className="section-heading">
              <ZoomIn size={18} /> Screenshot Gallery
              <span className="section-count">{images.length} foto</span>
            </h2>
            <div className="detail-gallery">
              {images.map((imgUrl, index) => (
                <div
                  key={index}
                  className="gallery-thumb"
                  onClick={() => openLightbox(index)}
                >
                  <img src={imgUrl} alt={`Screenshot ${index + 1}`} loading="lazy" />
                  <div className="gallery-thumb-overlay">
                    <ZoomIn size={20} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── README ───────────────────────────────────────── */}
        <div className="detail-section">
          <h2 className="section-heading">
            <FileText size={18} /> Dokumentasi
          </h2>
          {project.readme ? (
            <div className="readme-container">
              <div className="readme-header">
                <div className="readme-header-dot red" />
                <div className="readme-header-dot yellow" />
                <div className="readme-header-dot green" />
                <span className="readme-filename">README.md</span>
              </div>
              <div className="markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                    ),
                    img: ({ src, alt }) => (
                      <img src={src} alt={alt} style={{ maxWidth: '100%', borderRadius: '8px' }} />
                    ),
                  }}
                >
                  {project.readme}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="no-readme">
              <FileText size={32} />
              <p>Tidak ada README untuk proyek ini.</p>
            </div>
          )}
        </div>

        {/* ─── Bottom CTA ───────────────────────────────────── */}
        <div className="detail-cta-bar">
          <div className="cta-left">
            <span className="cta-title">{project.title}</span>
            <span className="cta-sub">
              {isFree ? 'Tersedia gratis untuk semua' : `Rp ${project.price?.toLocaleString('id-ID')}`}
            </span>
          </div>
          <div className="cta-action">
            {isFree ? (
              <button onClick={handleFreeDownload} className="btn btn-primary action-btn">
                <Download size={18} /> Download Gratis
              </button>
            ) : hasPurchased ? (
              <a href={project.downloadUrl} className="btn btn-success action-btn" target="_blank" rel="noopener noreferrer">
                <LockOpen size={18} /> Download Premium
              </a>
            ) : (
              <button onClick={handleBuy} className="btn btn-primary action-btn">
                <ShoppingCart size={18} /> Beli Rp {project.price?.toLocaleString('id-ID')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
