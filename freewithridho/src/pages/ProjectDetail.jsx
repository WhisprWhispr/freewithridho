import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Download, ArrowLeft, FileText, ShoppingCart, LockOpen,
  Heart, Tag, Star, ZoomIn, X, ChevronLeft, ChevronRight,
  Shield, Zap, Package, User, Share2, Link2, MessageCircle,
  Hash, Eye, Copy, Check, Send, ThumbsUp, Edit3, Trash2, MonitorPlay, ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getProjectById, checkUserPurchase } from '../services/projectService';
import { isWishlisted, toggleWishlist, isWishlistedFirestore, toggleWishlistFirestore } from '../services/wishlistService';
import { listenToProjectReviews, submitReview, getUserReview } from '../services/reviewService';
import { listenToComments, sendComment, deleteComment } from '../services/discussionService';
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

  // Wishlist state
  const [wishlisted, setWishlisted] = useState(false);

  // Share menu state
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // Live Preview state
  const [showDemoModal, setShowDemoModal] = useState(false);

  // Detail tab state: 'readme' | 'reviews' | 'discussion'
  const [detailTab, setDetailTab] = useState('readme');

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewAvg, setReviewAvg] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [myHoverRating, setMyHoverRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [existingReview, setExistingReview] = useState(null);

  // Discussions state
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

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

        // Wishlist check (Firestore)
        if (user) {
          const wl = await isWishlistedFirestore(user.uid, id);
          setWishlisted(wl);
          if (data.price > 0) {
            const purchased = await checkUserPurchase(user.uid, id);
            setHasPurchased(purchased);
            // Get existing review
            const existing = await getUserReview(id, user.uid);
            if (existing) {
              setExistingReview(existing);
              setMyRating(existing.rating);
              setMyComment(existing.comment);
            }
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

  // Listen to reviews
  useEffect(() => {
    const unsub = listenToProjectReviews(id, ({ reviews, average, totalCount }) => {
      setReviews(reviews);
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

  const handleSubmitReview = async () => {
    if (!user) { toast.error('Login dahulu!'); return; }
    if (!hasPurchased && project?.price > 0) { toast.error('Hanya pembeli yang bisa memberi review.'); return; }
    if (myRating === 0) { toast.error('Pilih rating bintang dahulu.'); return; }
    setSubmittingReview(true);
    try {
      await submitReview(id, user.uid, user.displayName || user.email, myRating, myComment);
      toast.success(existingReview ? 'Review diperbarui!' : 'Review berhasil dikirim! ⭐');
      setExistingReview({ rating: myRating, comment: myComment });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSendComment = async () => {
    if (!user) { toast.error('Login dahulu untuk berkomentar!'); return; }
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      await sendComment(id, user.uid, user.displayName || user.email?.split('@')[0], commentText, replyingTo);
      setCommentText('');
      setReplyingTo(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(id, commentId);
      toast.success('Komentar dihapus.');
    } catch (e) {
      toast.error('Gagal menghapus komentar.');
    }
  };

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

            {/* Price Box */}
            <div className="detail-price-box">
              <div className="price-left">
                {isFree ? (
                  <>
                    <span className="price-label">Harga</span>
                    <span className="price-value free-price">Gratis</span>
                  </>
                ) : project.isFlashSale ? (
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
                    <span className="price-label">Harga</span>
                    <span className="price-value paid-price">
                      Rp {project.price?.toLocaleString('id-ID')}
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

            {/* Live Preview Button */}
            {project.demoUrl && (
              <button 
                onClick={() => setShowDemoModal(true)} 
                className="btn btn-outline" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}
              >
                <MonitorPlay size={18} /> Live Preview
              </button>
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
              className={`detail-tab-btn ${detailTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setDetailTab('reviews')}
            >
              <Star size={15} /> Review
              {reviewCount > 0 && <span className="tab-badge">{reviewCount}</span>}
            </button>
            <button
              className={`detail-tab-btn ${detailTab === 'discussion' ? 'active' : ''}`}
              onClick={() => setDetailTab('discussion')}
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

          {/* REVIEWS TAB */}
          {detailTab === 'reviews' && (
            <div className="reviews-section">
              {/* Rating summary */}
              {reviewCount > 0 && (
                <div className="review-summary">
                  <div className="review-avg-score">{reviewAvg.toFixed(1)}</div>
                  <div className="review-avg-stars">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={20} fill={s <= Math.round(reviewAvg) ? '#fbbf24' : 'none'} color={s <= Math.round(reviewAvg) ? '#fbbf24' : '#475569'} />
                    ))}
                    <span className="review-count-label">{reviewCount} ulasan</span>
                  </div>
                </div>
              )}

              {/* Write review form (only buyers or free project) */}
              {user && (hasPurchased || !project.price || project.price === 0) && (
                <div className="review-form">
                  <h4>{existingReview ? 'Perbarui Ulasan Anda' : 'Tulis Ulasan'}</h4>
                  <div className="star-selector">
                    {[1,2,3,4,5].map(s => (
                      <button
                        key={s}
                        className="star-btn"
                        onMouseEnter={() => setMyHoverRating(s)}
                        onMouseLeave={() => setMyHoverRating(0)}
                        onClick={() => setMyRating(s)}
                      >
                        <Star size={28} fill={(myHoverRating || myRating) >= s ? '#fbbf24' : 'none'} color={(myHoverRating || myRating) >= s ? '#fbbf24' : '#475569'} />
                      </button>
                    ))}
                    <span className="star-label">
                      {myHoverRating === 5 ? 'Luar biasa!' : myHoverRating === 4 ? 'Sangat bagus' : myHoverRating === 3 ? 'Lumayan' : myHoverRating === 2 ? 'Kurang' : myHoverRating === 1 ? 'Buruk' : myRating > 0 ? `${myRating} bintang` : 'Pilih rating'}
                    </span>
                  </div>
                  <textarea
                    className="review-textarea"
                    placeholder="Ceritakan pengalaman Anda dengan source code ini..."
                    value={myComment}
                    onChange={e => setMyComment(e.target.value)}
                    rows={3}
                  />
                  <button
                    className="btn-review-submit"
                    onClick={handleSubmitReview}
                    disabled={submittingReview || myRating === 0}
                  >
                    {submittingReview ? 'Mengirim...' : existingReview ? 'Perbarui Ulasan' : '⭐ Kirim Ulasan'}
                  </button>
                </div>
              )}

              {/* Review list */}
              {reviews.length === 0 ? (
                <div className="no-reviews">
                  <Star size={32} color="#475569" />
                  <p>Belum ada ulasan. Jadilah yang pertama!</p>
                </div>
              ) : (
                <div className="review-list">
                  {reviews.map(r => (
                    <div key={r.id} className={`review-item ${r.userId === user?.uid ? 'own-review' : ''}`}>
                      <div className="review-header">
                        <div className="review-avatar">{(r.displayName || 'A')[0].toUpperCase()}</div>
                        <div>
                          <div className="review-author">{r.displayName}</div>
                          <div className="review-stars">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} size={13} fill={s <= r.rating ? '#fbbf24' : 'none'} color={s <= r.rating ? '#fbbf24' : '#475569'} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="review-text">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DISCUSSION TAB */}
          {detailTab === 'discussion' && (
            <div className="discussion-section">
              {/* Comment input */}
              {user ? (
                <div className="comment-input-box">
                  {replyingTo && (
                    <div className="replying-to-banner">
                      Membalas komentar · <button onClick={() => setReplyingTo(null)}>✕ Batal</button>
                    </div>
                  )}
                  <textarea
                    className="comment-textarea"
                    placeholder={replyingTo ? 'Tulis balasan...' : 'Tulis pertanyaan atau komentar...'}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    rows={3}
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSendComment(); }}
                  />
                  <div className="comment-input-footer">
                    <span className="comment-hint">Ctrl+Enter untuk kirim</span>
                    <button
                      className="btn-comment-send"
                      onClick={handleSendComment}
                      disabled={sendingComment || !commentText.trim()}
                    >
                      <Send size={15} /> {sendingComment ? 'Mengirim...' : 'Kirim'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="comment-login-prompt">
                  <MessageCircle size={20} />
                  <span>Silakan <a href="/login">Login</a> untuk berkomentar.</span>
                </div>
              )}

              {/* Comment list */}
              {comments.length === 0 ? (
                <div className="no-comments">
                  <MessageCircle size={32} color="#475569" />
                  <p>Belum ada diskusi. Jadilah yang pertama bertanya!</p>
                </div>
              ) : (
                <div className="comment-list">
                  {comments.filter(c => !c.replyToId).map(comment => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-avatar">{(comment.displayName || 'A')[0].toUpperCase()}</div>
                      <div className="comment-content">
                        <div className="comment-meta">
                          <span className="comment-author">{comment.displayName}</span>
                          {comment.edited && <span className="comment-edited">(diedit)</span>}
                        </div>
                        <p className="comment-text">{comment.text}</p>
                        <div className="comment-actions">
                          <button className="comment-action-btn" onClick={() => setReplyingTo(comment.id)}>
                            <MessageCircle size={13} /> Balas
                          </button>
                          {(user?.uid === comment.userId || user?.email === 'ridhosandhika18022022@gmail.com') && (
                            <button className="comment-action-btn danger" onClick={() => handleDeleteComment(comment.id)}>
                              <Trash2 size={13} /> Hapus
                            </button>
                          )}
                        </div>
                        {/* Replies */}
                        {comments.filter(c => c.replyToId === comment.id).map(reply => (
                          <div key={reply.id} className="comment-reply">
                            <div className="comment-avatar sm">{(reply.displayName || 'A')[0].toUpperCase()}</div>
                            <div className="comment-content">
                              <div className="comment-meta">
                                <span className="comment-author">{reply.displayName}</span>
                              </div>
                              <p className="comment-text">{reply.text}</p>
                              {(user?.uid === reply.userId || user?.email === 'ridhosandhika18022022@gmail.com') && (
                                <button className="comment-action-btn danger" onClick={() => handleDeleteComment(reply.id)}>
                                  <Trash2 size={13} /> Hapus
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                <ShoppingCart size={18} /> Beli Rp {project.price?.toLocaleString('id-ID')}
              </button>
            )}
          </div>
        </div>
      </div>
      {/* DEMO MODAL */}
      {showDemoModal && project.demoUrl && (
        <div className="demo-modal-overlay">
          <div className="demo-modal-content">
            <div className="demo-modal-header">
              <h3>Live Preview: {project.title}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a href={project.demoUrl} target="_blank" rel="noreferrer" className="btn-open-new-tab">
                  Buka di Tab Baru <ExternalLink size={14} />
                </a>
                <button className="btn-close-demo" onClick={() => setShowDemoModal(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="demo-modal-body">
              <iframe src={project.demoUrl} title="Live Demo" className="demo-iframe" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
