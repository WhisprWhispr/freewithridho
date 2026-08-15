import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X, Send, Trash2, CornerUpLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { listenToComments, sendComment, deleteComment } from '../services/discussionService';
import './DiscussionModal.css';

const ADMIN_EMAIL = 'supportfreewithridho@gmail.com';

/**
 * Format timestamp to HH:MM
 */
function formatTime(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date for divider: "Hari ini", "Kemarin", or date string
 */
function formatDateDivider(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hari Ini';
  if (date.toDateString() === yesterday.toDateString()) return 'Kemarin';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Group messages by date for dividers
 */
function groupMessagesByDate(messages) {
  const groups = [];
  let lastDateStr = null;
  messages.forEach((msg) => {
    const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
    const dateStr = date.toDateString();
    if (dateStr !== lastDateStr) {
      groups.push({ type: 'divider', label: formatDateDivider(msg.createdAt), key: `div-${dateStr}` });
      lastDateStr = dateStr;
    }
    groups.push({ type: 'message', data: msg });
  });
  return groups;
}

const DiscussionModal = ({ projectId, projectTitle, user, onClose }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { id, displayName, text }
  const bodyRef = useRef(null);
  const textareaRef = useRef(null);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Listen to comments real-time
  useEffect(() => {
    if (!projectId) return;
    const unsub = listenToComments(projectId, (data) => {
      setComments(data);
    });
    return () => unsub();
  }, [projectId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [comments]);

  // Close on ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSend = async () => {
    if (!user) { toast.error('Login dahulu untuk berkomentar!'); return; }
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendComment(
        projectId,
        user.uid,
        user.displayName || user.email?.split('@')[0] || 'Pengguna',
        text,
        replyingTo?.id || null
      );
      setText('');
      setReplyingTo(null);
      textareaRef.current?.focus();
    } catch (e) {
      toast.error(e.message || 'Gagal mengirim pesan.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(projectId, commentId);
      toast.success('Pesan dihapus.');
    } catch {
      toast.error('Gagal menghapus pesan.');
    }
  };

  const handleReply = (comment) => {
    setReplyingTo({ id: comment.id, displayName: comment.displayName, text: comment.text });
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isOwnMsg = useCallback((msg) => user && msg.userId === user.uid, [user]);
  const isAdmin = useCallback(() => user && user.email === ADMIN_EMAIL, [user]);
  const canDelete = useCallback((msg) => isOwnMsg(msg) || isAdmin(), [isOwnMsg, isAdmin]);

  // Build top-level + replies
  const topLevel = comments.filter((c) => !c.replyToId);
  const getReplies = (parentId) => comments.filter((c) => c.replyToId === parentId);
  const getParent = (id) => comments.find((c) => c.id === id);

  // Group top-level messages by date
  const grouped = groupMessagesByDate(topLevel);
  const totalCount = comments.length;

  return (
    <div className="disc-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="disc-modal" role="dialog" aria-modal="true" aria-label="Ruang Diskusi">

        {/* ── Header ── */}
        <div className="disc-header">
          <div className="disc-header-icon">
            <MessageCircle size={18} />
          </div>
          <div className="disc-header-info">
            <p className="disc-header-title">💬 {projectTitle || 'Ruang Diskusi'}</p>
            <p className="disc-header-sub">
              {totalCount > 0
                ? <><span>●</span> {totalCount} pesan dalam diskusi ini</>
                : 'Belum ada pesan — jadilah yang pertama!'}
            </p>
          </div>
          <button className="disc-close-btn" onClick={onClose} title="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* ── Body / Messages ── */}
        <div className="disc-body" ref={bodyRef}>
          {topLevel.length === 0 ? (
            <div className="disc-empty">
              <MessageCircle size={48} />
              <p>Belum ada diskusi untuk proyek ini.</p>
              <p style={{ fontSize: '0.8rem' }}>Mulai bertanya atau beri komentar! 👇</p>
            </div>
          ) : (
            grouped.map((item) => {
              if (item.type === 'divider') {
                return (
                  <div key={item.key} className="disc-date-divider">
                    {item.label}
                  </div>
                );
              }

              const comment = item.data;
              const own = isOwnMsg(comment);
              const replies = getReplies(comment.id);

              return (
                <div key={comment.id}>
                  {/* ── Parent Message ── */}
                  <div className={`disc-msg-row ${own ? 'own' : ''}`}>
                    <div className={`disc-avatar ${own ? '' : ''}`}>
                      {(comment.displayName || 'A')[0].toUpperCase()}
                    </div>
                    <div className="disc-bubble-wrap">
                      {!own && (
                        <div className="disc-bubble-author">{comment.displayName}</div>
                      )}
                      <div className={`disc-bubble ${own ? 'own' : 'other'}`}>
                        {comment.text}
                      </div>
                      <div className="disc-bubble-time">
                        {formatTime(comment.createdAt)}
                        {comment.edited && <span style={{ fontSize: '0.62rem', opacity: 0.6 }}>· diedit</span>}
                      </div>
                      <div className="disc-msg-actions">
                        <button
                          className="disc-action-btn"
                          onClick={() => handleReply(comment)}
                          title="Balas"
                        >
                          <CornerUpLeft size={11} /> Balas
                        </button>
                        {canDelete(comment) && (
                          <button
                            className="disc-action-btn danger"
                            onClick={() => handleDelete(comment.id)}
                            title="Hapus"
                          >
                            <Trash2 size={11} /> Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Replies ── */}
                  {replies.map((reply) => {
                    const ownReply = isOwnMsg(reply);
                    return (
                      <div key={reply.id} className={`disc-msg-row reply-row ${ownReply ? 'own' : ''}`}
                        style={{ paddingLeft: ownReply ? 0 : '2.5rem', paddingRight: ownReply ? '2.5rem' : 0 }}>
                        <div className="disc-avatar">
                          {(reply.displayName || 'A')[0].toUpperCase()}
                        </div>
                        <div className="disc-bubble-wrap">
                          {!ownReply && (
                            <div className="disc-bubble-author">{reply.displayName}</div>
                          )}
                          <div className={`disc-bubble ${ownReply ? 'own' : 'other'}`}>
                            {/* Reply quote */}
                            <div className="disc-reply-quote">
                              <div className="disc-reply-quote-author">
                                ↩ {comment.displayName}
                              </div>
                              <div style={{ fontSize: '0.76rem' }}>
                                {comment.text.length > 60 ? comment.text.slice(0, 60) + '…' : comment.text}
                              </div>
                            </div>
                            {reply.text}
                          </div>
                          <div className="disc-bubble-time">
                            {formatTime(reply.createdAt)}
                          </div>
                          <div className="disc-msg-actions">
                            {canDelete(reply) && (
                              <button
                                className="disc-action-btn danger"
                                onClick={() => handleDelete(reply.id)}
                                title="Hapus"
                              >
                                <Trash2 size={11} /> Hapus
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer / Input ── */}
        <div className="disc-footer">
          {user ? (
            <>
              {replyingTo && (
                <div className="disc-reply-banner">
                  <CornerUpLeft size={14} />
                  <span>
                    Balas <strong>{replyingTo.displayName}</strong>:{' '}
                    {replyingTo.text.length > 50 ? replyingTo.text.slice(0, 50) + '…' : replyingTo.text}
                  </span>
                  <button className="disc-reply-cancel" onClick={() => setReplyingTo(null)} title="Batal balas">
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="disc-input-row">
                <textarea
                  ref={textareaRef}
                  className="disc-textarea"
                  placeholder={replyingTo ? `Balas ${replyingTo.displayName}...` : 'Tulis pesan...'}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <button
                  className="disc-send-btn"
                  onClick={handleSend}
                  disabled={sending || !text.trim()}
                  title="Kirim (Enter)"
                >
                  <Send size={17} />
                </button>
              </div>
              <div className="disc-hint">Enter untuk kirim · Shift+Enter baris baru</div>
            </>
          ) : (
            <div className="disc-login-prompt">
              <Link to="/login">Login</Link> untuk ikut berdiskusi
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DiscussionModal;
