import React, { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { toast } from 'react-hot-toast';
import { X, ShieldCheck } from 'lucide-react';

const AvatarModal = ({ isOpen, onClose, user, onAvatarUpdated, isAdmin }) => {
  const [saving, setSaving] = useState(false);
  
  if (!isOpen) return null;

  // Generate 50 bottts seeds for tech-themed avatars
  const regularAvatars = Array.from({ length: 50 }, (_, i) => `https://api.dicebear.com/7.x/bottts/svg?seed=AvatarBot${i + 1}&backgroundColor=e2e8f0,bbf7d0,c7d2fe,fbcfe8,fed7aa`);
  
  // 5 Special Verified Admin Avatars (using micah style for distinction, appended with #verified)
  const adminAvatars = isAdmin ? Array.from({ length: 5 }, (_, i) => `https://api.dicebear.com/7.x/bottts/svg?seed=AdminBot${i + 1}&backgroundColor=3b82f6#verified`) : [];

  const avatars = [...adminAvatars, ...regularAvatars];

  const selectAvatar = async (url) => {
    setSaving(true);
    try {
      // 1. Update Firebase Auth Profile
      await updateProfile(auth.currentUser, { photoURL: url });
      
      // 2. Update Firestore user document so it's visible in PublicProfile
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { photoURL: url }, { merge: true });
      
      toast.success("Foto profil berhasil diperbarui!");
      if (onAvatarUpdated) onAvatarUpdated(url);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Gagal memperbarui foto profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', padding: '1.5rem', background: '#0f172a', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>Pilih Avatar Teknologi</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        {saving && <p style={{ color: '#10b981', textAlign: 'center', marginBottom: '1rem' }}>Menyimpan...</p>}
        
        {isAdmin && (
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ color: '#3b82f6', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={16} /> Avatar Khusus Admin (Verified)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {adminAvatars.map((url, i) => (
                <div 
                  key={`admin-${i}`} 
                  style={{ 
                    cursor: 'pointer', 
                    borderRadius: '50%', 
                    position: 'relative',
                    overflow: 'visible', 
                    border: user.photoURL === url ? '3px solid #3b82f6' : '3px solid transparent',
                    transition: 'all 0.2s',
                    aspectRatio: '1',
                    background: '#1e293b'
                  }}
                  onClick={() => !saving && selectAvatar(url)}
                >
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                    <img src={url} alt={`Admin Avatar ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#3b82f6', borderRadius: '50%', padding: '2px', border: '2px solid #0f172a', zIndex: 10 }}>
                    <ShieldCheck size={14} color="white" />
                  </div>
                </div>
              ))}
            </div>
            <h4 style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Avatar Reguler</h4>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '1rem' }}>
          {regularAvatars.map((url, i) => (
            <div 
              key={`reg-${i}`} 
              style={{ 
                cursor: 'pointer', 
                borderRadius: '50%', 
                overflow: 'hidden', 
                border: user.photoURL === url ? '3px solid #3b82f6' : '3px solid transparent',
                transition: 'all 0.2s',
                aspectRatio: '1',
                background: '#1e293b'
              }}
              onClick={() => !saving && selectAvatar(url)}
              onMouseEnter={(e) => {
                if (user.photoURL !== url) e.currentTarget.style.border = '3px solid #64748b';
              }}
              onMouseLeave={(e) => {
                if (user.photoURL !== url) e.currentTarget.style.border = '3px solid transparent';
              }}
            >
              <img src={url} alt={`Avatar ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AvatarModal;
