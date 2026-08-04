// Auth Context — provides global authentication state to the whole app
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true); // true while Firebase checks session

  useEffect(() => {
    // Listen to Firebase auth state changes (login/logout, page refresh)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Auto-delete and logout if user is in banned list
        const bannedRef = doc(db, 'banned_users', firebaseUser.email.toLowerCase());
        try {
          const snap = await getDoc(bannedRef);
          if (snap.exists()) {
            try {
              await firebaseUser.delete(); // Completely wipe the auth account
            } catch (e) {
              console.error('Auto-delete failed (might need recent login)', e);
            }
            await signOut(auth);
            setUser(null);
            setIsAdmin(false);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Failed to check banned status', err);
        }
      }

      setUser(firebaseUser);
      // Cek apakah user adalah admin
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'ridhosandhika18022022@gmail.com';
      setIsAdmin(firebaseUser && firebaseUser.email === adminEmail);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const bannedRef = doc(db, 'banned_users', email.toLowerCase());
    const snap = await getDoc(bannedRef);
    if (snap.exists()) {
      throw new Error('Akun Anda telah DIBLOKIR PERMANEN karena pelanggaran kebijakan.');
    }
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email, password, name) => {
    const bannedRef = doc(db, 'banned_users', email.toLowerCase());
    const snap = await getDoc(bannedRef);
    if (snap.exists()) {
      throw new Error('Email ini telah diblokir dan tidak dapat digunakan lagi.');
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Save display name immediately so navbar shows it right away
    if (name && name.trim()) {
      await updateProfile(userCredential.user, { displayName: name.trim() });
    }
    return userCredential;
  };

  const logout = async () => {
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy access to auth context
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
