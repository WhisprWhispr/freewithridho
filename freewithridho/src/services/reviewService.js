// Review Service — Firestore subcollection: reviews/{projectId}/userReviews/{userId}
import {
  collection, doc, setDoc, getDocs, onSnapshot, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Submit atau update review untuk sebuah proyek
 * Hanya bisa 1 review per user per proyek
 */
export async function submitReview(projectId, userId, displayName, rating, comment) {
  if (!userId) throw new Error('Harus login untuk memberi review.');
  if (rating < 1 || rating > 5) throw new Error('Rating harus antara 1–5.');
  if (!comment || comment.trim().length < 5) throw new Error('Komentar minimal 5 karakter.');

  const ref = doc(db, 'reviews', projectId, 'userReviews', userId);
  await setDoc(ref, {
    userId,
    displayName: displayName || 'Anonim',
    rating,
    comment: comment.trim(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Listen to reviews for a specific project in real-time
 * Returns { reviews, average, totalCount }
 */
export function listenToProjectReviews(projectId, callback) {
  const colRef = collection(db, 'reviews', projectId, 'userReviews');
  const q = query(colRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const reviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const totalCount = reviews.length;
    const average = totalCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount
      : 0;
    callback({ reviews, average, totalCount });
  }, (err) => {
    console.error('Error listening to reviews:', err);
    callback({ reviews: [], average: 0, totalCount: 0 });
  });
}

/**
 * Get user's existing review for a project (one-time fetch)
 */
export async function getUserReview(projectId, userId) {
  if (!userId || !projectId) return null;
  try {
    const { getDoc } = await import('firebase/firestore');
    const ref = doc(db, 'reviews', projectId, 'userReviews', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data();
  } catch {
    return null;
  }
}
