import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Download, ArrowLeft, FileText, ShoppingCart, LockOpen,
  Heart, Tag, Star, ZoomIn, X, ChevronLeft, ChevronRight,
  Shield, Zap, Package, User, Share2, Link2, MessageCircle,
  Hash, Copy, Check, MonitorPlay, ExternalLink, Loader2, Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getProjectById, checkUserPurchase } from '../services/projectService';
import { isWishlisted, toggleWishlist, isWishlistedFirestore, toggleWishlistFirestore } from '../services/wishlistService';
import { listenToProjectReviews } from '../services/reviewService';
import { listenToComments } from '../services/discussionService';
import { isFlashSaleActive, getProjectPrice } from '../utils/flashSaleHelper';
import DiscussionModal from '../components/DiscussionModal';
import ReviewModal from '../components/ReviewModal';
import './ProjectDetail.css';

// Professional share text generator
const generateShareText = (project) => {
  const isFree = !project.price || project.price === 0;
  const priceText = isFree ? 'GRATIS 🎉' : `Rp ${project.price.toLocaleString('id-ID')}`;
  const categoryEmojis = {
    Web: '🌐', Mobile: '📱', Game: '🎮', Basic: '💡', Premium: '⭐', default: '💻'
  };
  const emoji = categoryEmojis[project.category] || categoryEmojis.default;

  return `${emoji} *${project.title}*

📁 Kategori: ${project.category}
💰 Harga: ${priceText}

${project.description?.slice(0, 120)}${project.description?.length > 120 ? '...' : ''}

✅ Source code berkualitas tinggi
✅ Dokumentasi lengkap
✅ Siap pakai & dikembangkan

🔗 Lihat selengkapnya:
${window.location.href}

_FreeWithRidho — Source Code For Everyone_`;
};

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
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // Custom Domain Package States
  const [useWebPackage, setUseWebPackage] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState('');
  const [customDomainName, setCustomDomainName] = useState('');
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [domainStatus, setDomainStatus] = useState(null); // 'available' | 'unavailable' | 'error' | null
  const [showDomainInfo, setShowDomainInfo] = useState(false);

  // Wishlist state
  const [wishlisted, setWishlisted] = useState(false);

  // Share menu state
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // Detail tab state: 'readme' | 'reviews' | 'discussion'
  const [detailTab, setDetailTab] = useState('readme');

  // Reviews state — only count for tab badge
  const [reviewAvg, setReviewAvg] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  // Discussions state — only count for tab badge
  const [comments, setComments] = useState([]);
  
  // Modal open states
  const [showDiscModal, setShowDiscModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const handleBuy = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (useWebPackage && !customDomainName.trim()) {
      toast.error('Mohon masukkan nama domain kustom yang Anda inginkan (misal: namatoko)');
      return;
    }
    
    if (useWebPackage) {
      navigate(`/checkout/${id}?pkg=hosting_domain&ext=${selectedExtension}&domain=${encodeURIComponent(customDomainName.trim())}`);
    } else {
      navigate(`/checkout/${id}`);
    }
  };

  const checkDomain = async () => {
    if (!customDomainName.trim()) {
      toast.error('Masukkan nama domain terlebih dahulu');
      return;
    }
    
    const fullDomain = `${customDomainName.trim()}${selectedExtension || '.com'}`;
    setCheckingDomain(true);
    setDomainStatus(null);
    
    try {
      // Using Google DNS over HTTPS (JSON format)
      const response = await fetch(`https://dns.google/resolve?name=${fullDomain}&type=A`);
      const data = await response.json();
      
      // Status: 0 = NOERROR (exists/registered), 3 = NXDOMAIN (doesn't exist/might be available)
      if (data.Status === 3) {
         setDomainStatus('available');
         toast.success(`Domain ${fullDomain} tersedia!`);
      } else if (data.Status === 0) {
         setDomainStatus('unavailable');
         toast.error(`Maaf, domain ${fullDomain} sudah terdaftar.`);
      } else {
         setDomainStatus('error');
         toast.error('Gagal mengecek ketersediaan domain.');
      }
    } catch (e) {
      console.error(e);
      setDomainStatus('error');
      toast.error('Gagal menghubungi server pengecekan domain.');
    } finally {
      setCheckingDomain(false);
    }
  };

  const getDynamicPrice = () => {
    if (!project) return 0;
    let base = isFlashSaleActive(project) ? (project.discountPrice || 0) : (project.price || 0);
    if (!project.offersWebPackages || !useWebPackage) return base;
    
    const selectedOpt = project.domainOptions?.find(opt => opt.extension === selectedExtension);
    if (selectedOpt) {
      return base + (Number(selectedOpt.price) || 0);
    }
    return base;
  };

  const handleFreeDownload = (e) => {
    e.preventDefault();
    setShowAdModal(true);
  };

  const proceedToDownload = () => {
    setShowAdModal(false);
    navigate(`/safelink/${id}`);
  };

  // Toggle wishlist (Firestore-based)
  const handleWishlist = async () => {
    if (!user) {
      toast.error('Login dahulu untuk menyimpan favorit!');
      return;
    }
    const nowWishlisted = await toggleWishlistFirestore(user.uid, id);
    setWishlisted(nowWishlisted);
    if (nowWishlisted) {
      toast.success('❤️ Ditambahkan ke Favorit!', {
        style: { background: '#1e1b4b', border: '1px solid rgba(139,92,246,0.3)' }
      });
    } else {
      toast('💔 Dihapus dari Favorit', { icon: null });
    }
  };

  // Copy link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('🔗 Link berhasil disalin!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin link');
    }
    setShowShareMenu(false);
  };

  // Share to WhatsApp
  const handleShareWhatsApp = () => {
    if (!project) return;
    const text = generateShareText(project);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowShareMenu(false);
  };

  // Share to Twitter/X
  const handleShareTwitter = () => {
    if (!project) return;
    const isFree = !project.price || project.price === 0;
    const text = `🔥 ${project.title} — Source code ${isFree ? 'GRATIS' : `Rp ${project.price?.toLocaleString('id-ID')}`} di FreeWithRidho!\n\n${window.location.href}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowShareMenu(false);
  };

  // Native share (mobile)
  const handleNativeShare = async () => {
    if (!project) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: project.title,
          text: `${project.description?.slice(0, 100)}...`,
          url: window.location.href,
        });
      } catch {}
    } else {
      setShowShareMenu(true);
    }
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

  // Touch handlers for swiping
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) nextImage();
    if (distance < -minSwipeDistance) prevImage();
  };

  // Close lightbox on ESC
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { closeLightbox(); setShowShareMenu(false); }
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
        if (data.offersWebPackages && data.domainOptions?.length > 0) {
          setSelectedExtension(data.domainOptions[0].extension);
        }

        // Wishlist check (Firestore)
        if (user) {
          const wl = await isWishlistedFirestore(user.uid, id);
          setWishlisted(wl);
          if (data.price > 0) {
            const purchased = await checkUserPurchase(user.uid, id);
            setHasPurchased(purchased);
          }
        } else {
          setWishlisted(isWishlisted(id));
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

  // Listen to reviews just for badge counts
  useEffect(() => {
    const unsub = listenToProjectReviews(id, ({ average, totalCount }) => {
      setReviewAvg(average);
      setReviewCount(totalCount);
    });
    return () => unsub();
  }, [id]);

  // Listen to comments/discussions
  useEffect(() => {
    const unsub = listenToComments(id, (data) => setComments(data));
    return () => unsub();
  }, [id]);




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
  const finalPrice = getProjectPrice(project);

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

      {/* ─── Share Menu Dropdown ────────────────────────────── */}
      {showShareMenu && (
        <div className="share-overlay" onClick={() => setShowShareMenu(false)}>
          <div className="share-menu" onClick={e => e.stopPropagation()}>
            <div className="share-menu-header">
              <h3>Bagikan Proyek</h3>
              <button onClick={() => setShowShareMenu(false)}><X size={16} /></button>
            </div>
            <div className="share-preview">
              <div className="share-preview-title">{project.title}</div>
              <div className="share-preview-sub">
                {isFree ? '🎉 Gratis' : `💰 Rp ${project.price?.toLocaleString('id-ID')}`}
                {' · '}{project.category}
              </div>
            </div>
            <div className="share-options">
              <button className="share-option whatsapp" onClick={handleShareWhatsApp}>
                <MessageCircle size={20} />
                <span>WhatsApp</span>
              </button>
              <button className="share-option twitter" onClick={handleShareTwitter}>
                <Hash size={20} />
                <span>Twitter / X</span>
              </button>
              <button className="share-option copylink" onClick={handleCopyLink}>
                {copied ? <Check size={20} /> : <Link2 size={20} />}
                <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Lightbox ─────────────────────────────────────── */}
      {lightbox.open && images.length > 0 && (
        <div 
          className="lightbox-overlay" 
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
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
        {/* ─── Back + Action Buttons ───────────────────────── */}
        <div className="detail-topbar">
          <Link to="/" className="detail-back">
            <ArrowLeft size={16} /> Kembali
          </Link>
          <div className="detail-actions-top">
            {/* Wishlist / Favorite */}
            <button
              className={`action-btn-icon ${wishlisted ? 'wishlisted' : ''}`}
              onClick={handleWishlist}
              title={wishlisted ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
            >
              <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} />
              <span>{wishlisted ? 'Favorit' : 'Favorit'}</span>
            </button>
            {/* Share */}
            <button
              className="action-btn-icon share-btn"
              onClick={handleNativeShare}
              title="Bagikan proyek ini"
            >
              <Share2 size={18} />
              <span>Bagikan</span>
            </button>
          </div>
        </div>

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

            {/* Developer Info */}
            {project.developerName && (
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Dibuat oleh:</span>
                <Link to={`/user/${project.ownerId}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 1rem 0.4rem 0.4rem', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)', transition: 'background 0.2s' }} className="detail-dev-link">
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}>
                    {project.developerName[0].toUpperCase()}
                  </div>
                  <span style={{ color: '#f8fafc', fontWeight: 500, fontSize: '0.9rem' }}>{project.developerName}</span>
                </Link>
              </div>
            )}

            {/* Package Selection */}
            {project.offersWebPackages && !hasPurchased && project.domainOptions?.length > 0 && (
              <div className="package-selection-box" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: useWebPackage ? '1rem' : '0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={useWebPackage} 
                      onChange={(e) => setUseWebPackage(e.target.checked)} 
                      style={{ width: '18px', height: '18px', accentColor: '#8b5cf6' }} 
                    />
                    <span style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Package size={18} style={{ color: '#8b5cf6' }} /> Tambah Paket Hosting & Custom Domain
                    </span>
                  </label>
                  <button 
                    onClick={() => setShowDomainInfo(true)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem' }}
                    title="Apa itu Custom Domain?"
                  >
                    <Info size={18} />
                  </button>
                </div>

                {project.webPackageDescription && (
                  <p style={{ margin: '0.5rem 0 1rem 0', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                    {project.webPackageDescription}
                  </p>
                )}

                {useWebPackage && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', animation: 'fadeIn 0.3s ease' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', display: 'block' }}>Ekstensi Domain Pilihan</label>
                      <select 
                        value={selectedExtension} 
                        onChange={(e) => setSelectedExtension(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                      >
                        {project.domainOptions.map((opt, idx) => (
                          <option key={idx} value={opt.extension}>
                            {opt.extension} (+ Rp {opt.price?.toLocaleString('id-ID')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', display: 'block' }}>Nama Domain Impian Anda</label>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                          <input 
                            type="text" 
                            placeholder="namatoko"
                            value={customDomainName} 
                            onChange={(e) => {
                              setCustomDomainName(e.target.value.replace(/\s+/g, '').toLowerCase());
                              setDomainStatus(null);
                            }}
                            style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
                          />
                          <div style={{ padding: '0.75rem 1rem', background: 'rgba(139,92,246,0.2)', borderLeft: '1px solid rgba(139,92,246,0.4)', borderRadius: '0 8px 8px 0', color: '#c4b5fd', fontWeight: 600 }}>
                            {selectedExtension || '.com'}
                          </div>
                        </div>
                        <button 
                          onClick={checkDomain}
                          disabled={checkingDomain || !customDomainName.trim()}
                          style={{ 
                            marginLeft: '0.5rem', 
                            padding: '0.75rem 1rem', 
                            background: checkingDomain ? '#475569' : '#3b82f6', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '8px', 
                            cursor: (checkingDomain || !customDomainName.trim()) ? 'not-allowed' : 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {checkingDomain ? <Loader2 size={18} className="spin" /> : 'Periksa'}
                        </button>
                      </div>
                      <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        Tanpa spasi. Contoh: bukawarung
                        {domainStatus === 'available' && <span style={{ color: '#10b981', marginLeft: '0.5rem', fontWeight: 'bold' }}>✓ Domain Tersedia</span>}
                        {domainStatus === 'unavailable' && <span style={{ color: '#ef4444', marginLeft: '0.5rem', fontWeight: 'bold' }}>✗ Domain Sudah Digunakan</span>}
                      </small>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Price Box */}
            <div className="detail-price-box">
              <div className="price-left">
                {isFree ? (
                  <>
                    <span className="price-label">Harga</span>
                    <span className="price-value free-price">Gratis</span>
                  </>
                ) : isFlashSaleActive(project) && !project.offersWebPackages ? (
                  <>
                    <span className="price-label" style={{ color: '#ef4444', fontWeight: 600 }}>⚡ Flash Sale</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="price-value paid-price" style={{ color: '#ef4444' }}>
                        Rp {project.discountPrice?.toLocaleString('id-ID')}
                      </span>
                      <span style={{ textDecoration: 'line-through', color: '#64748b', fontSize: '0.9rem' }}>
                        Rp {project.price?.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="price-label">Total Harga</span>
                    <span className="price-value paid-price">
                      Rp {getDynamicPrice().toLocaleString('id-ID')}
                    </span>
                    {project.offersWebPackages && useWebPackage && (
                       <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Termasuk biaya layanan tambahan</span>
                    )}
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

            {/* Live Preview Button */}
            {project.demoUrl && (
              <a 
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', textDecoration: 'none' }}
              >
                <MonitorPlay size={18} /> Live Preview
              </a>
            )}

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
                  <div className="feature-sub">Pembayaran via INSTANPAY</div>
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
          <div className="detail-section" style={{ marginTop: '0.5rem' }}>
            <button 
               className="btn btn-secondary gallery-open-btn" 
               style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '1rem', fontSize: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
               onClick={() => openLightbox(0)}
            >
              <ZoomIn size={18} /> Lihat Galeri Screenshot ({images.length} Foto)
            </button>
          </div>
        )}

        {/* ─── Tabs: README | Reviews | Diskusi ──────────────── */}
        <div className="detail-section">
          <div className="detail-tabs">
            <button
              className={`detail-tab-btn ${detailTab === 'readme' ? 'active' : ''}`}
              onClick={() => setDetailTab('readme')}
            >
              <FileText size={15} /> Dokumentasi
            </button>
            <button
              className="detail-tab-btn review-open-btn"
              onClick={() => setShowReviewModal(true)}
            >
              <Star size={15} /> Review
              {reviewCount > 0 && <span className="tab-badge">{reviewCount}</span>}
            </button>
            <button
              className="detail-tab-btn disc-open-btn"
              onClick={() => setShowDiscModal(true)}
            >
              <MessageCircle size={15} /> Diskusi
              {comments.length > 0 && <span className="tab-badge">{comments.length}</span>}
            </button>
          </div>

          {/* README TAB */}
          {detailTab === 'readme' && (
            <div>
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
                        code({node, inline, className, children, ...props}) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeString = String(children).replace(/\n$/, '');
                          if (!inline) {
                            return (
                              <div className="code-block-wrapper">
                                <div className="code-block-header">
                                  <span className="code-lang">{match ? match[1] : 'text'}</span>
                                  <button
                                    className="copy-code-btn"
                                    onClick={() => {
                                      navigator.clipboard.writeText(codeString);
                                      toast.success('Kode disalin!');
                                    }}
                                    title="Copy code"
                                  >
                                    <Copy size={14} /> Copy
                                  </button>
                                </div>
                                <pre className="markdown-pre">
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              </div>
                            )
                          }
                          return <code className={className} {...props}>{children}</code>
                        },
                        pre: ({ children }) => <>{children}</>
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
          )}

          {/* REVIEWS — opens as modal, nothing inline */}

          {/* DISCUSSION — opens as modal, nothing inline */}
        </div>

        {/* ─── Bottom CTA ───────────────────────────────────── */}
        <div className="detail-cta-bar">
          <div className="cta-left">
            <span className="cta-title">{project.title}</span>
            <span className="cta-sub">
              {isFree ? 'Tersedia gratis untuk semua' : `Rp ${finalPrice?.toLocaleString('id-ID')}`}
            </span>
          </div>
          <div className="cta-actions">
            <button
              className={`cta-fav-btn ${wishlisted ? 'wishlisted' : ''}`}
              onClick={handleWishlist}
              title={wishlisted ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
            >
              <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
            <button className="cta-share-btn" onClick={() => setShowShareMenu(true)}>
              <Share2 size={16} />
            </button>
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
                <ShoppingCart size={18} /> Beli Rp {finalPrice?.toLocaleString('id-ID')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Review Modal ─────────────────────────────── */}
      {showReviewModal && (
        <ReviewModal
          projectId={id}
          projectTitle={project.title}
          user={user}
          hasPurchased={hasPurchased}
          projectPrice={project.price}
          onClose={() => setShowReviewModal(false)}
        />
      )}

      {/* ── Discussion Modal ─────────────────────────────── */}
      {showDiscModal && (
        <DiscussionModal
          projectId={id}
          projectTitle={project.title}
          user={user}
          onClose={() => setShowDiscModal(false)}
        />
      )}

      {/* Domain Info Modal */}
      {showDomainInfo && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem', animation: 'fadeIn 0.2s ease' }}>
          <div className="modal-content" style={{ background: '#0f172a', padding: '2rem', borderRadius: '16px', maxWidth: '500px', width: '100%', border: '1px solid rgba(139,92,246,0.3)', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <button 
              onClick={() => setShowDomainInfo(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={24} style={{ color: '#8b5cf6' }} /> Mengapa Harus Custom Domain?
            </h2>
            <div style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: 1.6 }}>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Custom Domain</strong> adalah alamat unik website Anda di internet (misal: <em>www.namabisnisanda.com</em>). Memiliki domain sendiri memberikan dampak yang sangat besar untuk bisnis Anda:
              </p>
              <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li><strong>Meningkatkan Kredibilitas:</strong> Bisnis terlihat jauh lebih profesional dan terpercaya di mata pelanggan dibandingkan memakai domain gratisan.</li>
                <li><strong>Mudah Diingat:</strong> Pelanggan lebih mudah mengingat dan mengetik nama <em>brand</em> Anda secara langsung.</li>
                <li><strong>Meningkatkan SEO:</strong> Mesin pencari seperti Google lebih memprioritaskan website dengan <em>custom domain</em>, sehingga mempermudah calon klien menemukan bisnis Anda.</li>
                <li><strong>Identitas Email:</strong> Anda dapat memiliki email profesional dengan nama domain Anda sendiri (misal: <em>admin@namabisnisanda.com</em>).</li>
              </ul>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>
                Dengan membeli paket Hosting & Domain ini, kami akan membantu seluruh proses pendaftaran, konfigurasi *server*, hingga website Anda benar-benar *live* dan bisa diakses dunia!
              </p>
            </div>
            <button 
              onClick={() => setShowDomainInfo(false)}
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProjectDetail;
