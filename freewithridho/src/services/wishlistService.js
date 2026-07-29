// Wishlist Service — Firestore: wishlists/{userId}
// Upgraded from localStorage to Firestore for cross-device sync
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const STORAGE_KEY = 'freewithridho_wishlist'; // fallback for unauthenticated users

// ─── Firestore-based (authenticated) ────────────────────────────────────────

export async function getWishlistFromFirestore(userId) {
  if (!userId) return [];
  try {
    const ref = doc(db, 'wishlists', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    return snap.data().items || [];
  } catch {
    return [];
  }
}

export async function toggleWishlistFirestore(userId, projectId) {
  if (!userId) return toggleWishlist(projectId); // fallback
  try {
    const items = await getWishlistFromFirestore(userId);
    const isIn = items.includes(projectId);
    const updated = isIn
      ? items.filter(id => id !== projectId)
      : [...items, projectId];
    await setDoc(doc(db, 'wishlists', userId), { items: updated }, { merge: true });
    return !isIn; // returns true if now wishlisted
  } catch {
    return toggleWishlist(projectId); // fallback to localStorage
  }
}

export async function isWishlistedFirestore(userId, projectId) {
  if (!userId) return isWishlisted(projectId);
  const items = await getWishlistFromFirestore(userId);
  return items.includes(projectId);
}

// ─── localStorage fallback (unauthenticated) ────────────────────────────────

export function isWishlisted(id) {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  return saved.includes(id);
}

export function toggleWishlist(id) {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const isIn = saved.includes(id);
  const updated = isIn ? saved.filter(item => item !== id) : [...saved, id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return !isIn; // returns true if now wishlisted
}

export function getWishlist() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}
