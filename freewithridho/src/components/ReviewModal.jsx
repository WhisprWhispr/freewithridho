import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { listenToProjectReviews, submitReview, getUserReview } from '../services/reviewService';
import './ReviewModal.css';

const ReviewModal = ({ projectId, projectTitle, user, hasPurchased, projectPrice, onClose }) => {
  const [reviews, setReviews] = useState([]);
  const [reviewAvg, setReviewAvg] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  const [myRating, setMyRating] = useState(0);
  const [myHoverRating, setMyHoverRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Listen to reviews
  useEffect(() => {
    if (!projectId) return;
    const unsub = listenToProjectReviews(projectId, ({ reviews, average, totalCount }) => {
      setReviews(reviews);
      setReviewAvg(average);
      setReviewCount(totalCount);
    });
    return () => unsub();
  }, [projectId]);

  // Fetch existing user review
  useEffect(() => {
    if (!user || !projectId) return;
    const fetchExisting = async () => {
      const existing = await getUserReview(projectId, user.uid);
      if (existing) {
        setExistingReview(existing);
        setMyRating(existing.rating);
        setMyComment(existing.comment);
      }
    };
    fetchExisting();
  }, [projectId, user]);

  // Close on ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!user) { toast.error('Login dahulu!'); return; }
    if (myRating === 0) { toast.error('Pilih rating bintang dahulu.'); return; }
    if (myComment.trim().length < 5) { toast.error('Komentar terlalu pendek.'); return; }

    setSubmitting(true);
    try {
      await submitReview(
        projectId,
        user.uid,
        user.displayName || user.email?.split('@')[0],
        myRating,
        myComment
      );
      toast.success(existingReview ? 'Ulasan diperbarui! ⭐' : 'Ulasan berhasil dikirim! ⭐');
      setExistingReview({ rating: myRating, comment: myComment });
    } catch (e) {
      toast.error(e.message || 'Gagal mengirim ulasan');
    } finally {
      setSubmitting(false);
    }
  };

  const canReview = user && (hasPurchased || !projectPrice || projectPrice === 0);

  return (
    <div className="rv-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rv-modal" role="dialog" aria-modal="true" aria-label="Ulasan Proyek">

        {/* ── Header ── */}
        <div className="rv-header">
          <div className="rv-header-icon">
            <Star size={20} fill="currentColor" />
          </div>
          <div className="rv-header-info">
            <p className="rv-header-title">⭐ Ulasan {projectTitle}</p>
            <p className="rv-header-sub">
              {reviewCount} ulasan • Rata-rata {reviewAvg.toFixed(1)}
            </p>
          </div>
          <button className="rv-close-btn" onClick={onClose} title="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="rv-body">

          {/* Summary Card */}
          {reviewCount > 0 && (
            <div className="rv-summary">
              <div className="rv-avg-score">{reviewAvg.toFixed(1)}</div>
              <div className="rv-avg-right">
                <div className="rv-stars-row">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={22}
                      fill={s <= Math.round(reviewAvg) ? '#fbbf24' : 'none'}
                      color={s <= Math.round(reviewAvg) ? '#fbbf24' : '#475569'}
                    />
                  ))}
                </div>
                <div className="rv-count-label">Dari total {reviewCount} ulasan</div>
              </div>
            </div>
          )}

          {/* Form Write Review */}
          {user ? (
            canReview ? (
              <div className="rv-form">
                <h4 className="rv-form-title">
                  {existingReview ? 'Perbarui Ulasan Anda' : 'Beri Ulasan & Rating'}
                </h4>
                <div className="rv-star-selector">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      className="rv-star-btn"
                      onMouseEnter={() => setMyHoverRating(s)}
                      onMouseLeave={() => setMyHoverRating(0)}
                      onClick={() => setMyRating(s)}
                    >
                      <Star
                        size={32}
                        fill={(myHoverRating || myRating) >= s ? '#fbbf24' : 'none'}
                        color={(myHoverRating || myRating) >= s ? '#fbbf24' : '#475569'}
                      />
                    </button>
                  ))}
                  <span className="rv-star-label">
                    {myHoverRating === 5 ? 'Luar biasa!'
                      : myHoverRating === 4 ? 'Sangat bagus'
                      : myHoverRating === 3 ? 'Lumayan'
                      : myHoverRating === 2 ? 'Kurang'
                      : myHoverRating === 1 ? 'Buruk'
                      : myRating > 0 ? `${myRating} bintang`
                      : 'Pilih bintang'}
                  </span>
                </div>
                <textarea
                  className="rv-textarea"
                  placeholder="Ceritakan pengalaman Anda menggunakan source code ini..."
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  rows={3}
                />
                <button
                  className="rv-submit-btn"
                  onClick={handleSubmit}
                  disabled={submitting || myRating === 0}
                >
                  <Star size={16} fill="currentColor" />
                  {submitting ? 'Mengirim...' : existingReview ? 'Simpan Perubahan' : 'Kirim Ulasan'}
                </button>
              </div>
            ) : null /* Cannot review if not purchased & not free */
          ) : (
            <div className="rv-login-prompt">
              Silakan <Link to="/login">Login</Link> untuk memberi ulasan.
            </div>
          )}

          {/* Review List */}
          {reviews.length > 0 ? (
            <div>
              <h4 className="rv-list-title">Semua Ulasan ({reviewCount})</h4>
              <div className="rv-list">
                {reviews.map((r) => {
                  const isOwn = user && r.userId === user.uid;
                  return (
                    <div key={r.id} className={`rv-item ${isOwn ? 'own-review' : ''}`}>
                      <div className="rv-item-header">
                        <div className="rv-item-avatar">
                          {(r.displayName || 'A')[0].toUpperCase()}
                        </div>
                        <div className="rv-item-info">
                          <div className="rv-item-author">
                            {r.displayName}
                            {isOwn && <span className="rv-own-badge">Ulasan Anda</span>}
                          </div>
                          <div className="rv-item-stars">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={12}
                                fill={s <= r.rating ? '#fbbf24' : 'none'}
                                color={s <= r.rating ? '#fbbf24' : '#475569'}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="rv-item-text">{r.comment}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rv-empty">
              <Star size={40} color="#475569" opacity={0.5} />
              <p>Belum ada ulasan untuk proyek ini.<br />Jadilah yang pertama!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
