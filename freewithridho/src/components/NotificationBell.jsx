import { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Tag, Zap, Info, CheckCheck } from 'lucide-react';
import {
  collection, query, onSnapshot, orderBy, doc,
  writeBatch, where, getDocs, updateDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import './NotificationBell.css';

/**
 * Returns how long ago the timestamp was
 */
function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return 'Baru saja';
  if (secs < 3600) return `${Math.floor(secs / 60)} menit lalu`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} jam lalu`;
  return `${Math.floor(secs / 86400)} hari lalu`;
}

function getIconConfig(type) {
  switch (type) {
    case 'promo':   return { className: 'type-promo', icon: '🏷️' };
    case 'flash':   return { className: 'type-flash', icon: '⚡' };
    case 'info':    return { className: 'type-info',  icon: 'ℹ️' };
    default:        return { className: 'type-system', icon: '🔔' };
  }
}

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Real-time listener for notifications collection
  useEffect(() => {
    // Listen to global notifications (promo, flash sale, announcements)
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(items);
    }, (err) => {
      console.warn('Notification listener error:', err);
    });
    return () => unsub();
  }, []);

  // Compute unread count based on readBy array (per user)
  const unreadCount = user
    ? notifications.filter(n => !n.readBy?.includes(user.uid)).length
    : 0;

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAsRead = async (notifId) => {
    if (!user) return;
    const n = notifications.find(n => n.id === notifId);
    if (!n || n.readBy?.includes(user.uid)) return;
    try {
      await updateDoc(doc(db, 'notifications', notifId), {
        readBy: [...(n.readBy || []), user.uid]
      });
    } catch (e) {
      console.warn('Could not mark as read:', e);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.readBy?.includes(user.uid));
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), {
        readBy: [...(n.readBy || []), user.uid]
      });
    });
    try { await batch.commit(); } catch (e) { console.warn(e); }
  };

  return (
    <div style={{ position: 'relative' }} ref={wrapRef}>
      <button
        className="notif-bell-btn"
        onClick={() => setOpen(v => !v)}
        aria-label="Notifikasi"
        title="Notifikasi"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          <div className="notif-dropdown-overlay" onClick={() => setOpen(false)} />
          <div className="notif-dropdown">
            {/* Header */}
            <div className="notif-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={18} style={{ color: '#6366f1' }} />
                <h4>Notifikasi</h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {unreadCount > 0 && (
                  <button className="notif-mark-all" onClick={markAllAsRead}>
                    <CheckCheck size={13} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                    Tandai semua dibaca
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                  aria-label="Tutup"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* List */}
            <div className="notif-list">
              {notifications.length === 0 ? (
                <div className="notif-empty">
                  <BellOff size={36} />
                  <span>Belum ada notifikasi</span>
                </div>
              ) : (
                notifications.map(n => {
                  const isUnread = user ? !n.readBy?.includes(user.uid) : false;
                  const { className, icon } = getIconConfig(n.type);
                  return (
                    <div
                      key={n.id}
                      className={`notif-item ${isUnread ? 'unread' : ''}`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className={`notif-icon-wrap ${className}`}>{icon}</div>
                      <div className="notif-content">
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-desc">{n.message}</div>
                        <div className="notif-time">{timeAgo(n.createdAt)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
