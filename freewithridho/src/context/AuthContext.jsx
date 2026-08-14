// Auth Context — provides global authentication state to the whole app
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true); // true while Firebase checks session

  useEffect(() => {
    // Listen to Firebase auth state changes (login/logout, page refresh)
    // PENTING: Jangan lakukan async Firestore call di sini agar session
    // tetap terjaga saat halaman di-refresh. Banned-check hanya di login().
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'ridhosandhika18022022@gmail.com';
      setIsAdmin(!!firebaseUser && firebaseUser.email === adminEmail);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    // Cek banned — dibungkus try/catch agar error Firestore tidak blokir login
    try {
      const bannedRef = doc(db, 'banned_users', email.toLowerCase());
      const snap = await getDoc(bannedRef);
      if (snap.exists()) {
        throw new Error('Akun Anda telah DIBLOKIR PERMANEN karena pelanggaran kebijakan.');
      }
    } catch (err) {
      // Jika error bukan karena banned (misal Firestore timeout), tetap lanjutkan login
      if (err.message && err.message.includes('DIBLOKIR')) throw err;
      console.warn('Banned check skipped due to error:', err.message);
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Tolak login jika email belum diverifikasi (kecuali Admin)
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'ridhosandhika18022022@gmail.com';
    if (!userCredential.user.emailVerified && email !== adminEmail) {
      await signOut(auth);
      throw new Error('Email belum diverifikasi. Silakan cek kotak masuk email Anda dan klik link verifikasi.');
    }

    return userCredential;
  };

  const register = async (email, password, name) => {
    // Cek banned — dibungkus try/catch agar error Firestore tidak blokir registrasi
    try {
      const bannedRef = doc(db, 'banned_users', email.toLowerCase());
      const snap = await getDoc(bannedRef);
      if (snap.exists()) {
        throw new Error('Email ini telah diblokir dan tidak dapat digunakan lagi.');
      }
    } catch (err) {
      if (err.message && err.message.includes('diblokir')) throw err;
      console.warn('Banned check skipped due to error:', err.message);
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Save display name immediately so navbar shows it right away
    if (name && name.trim()) {
      await updateProfile(userCredential.user, { displayName: name.trim() });
    }

    // Kirim email verifikasi
    await sendEmailVerification(userCredential.user);

    // Jangan signOut di sini — Register.jsx akan menampilkan modal verifikasi
    // dan handle signOut jika user menutup modal tanpa verifikasi.

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
