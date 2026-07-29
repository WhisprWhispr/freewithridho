// Discussion Service — Firestore: discussions/{projectId}/comments/{commentId}
import {
  collection, addDoc, onSnapshot, serverTimestamp,
  query, orderBy, deleteDoc, doc, updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Kirim komentar baru
 */
export async function sendComment(projectId, userId, displayName, text, replyToId = null) {
  if (!userId) throw new Error('Harus login untuk berkomentar.');
  if (!text || text.trim().length < 2) throw new Error('Komentar terlalu pendek.');

  const colRef = collection(db, 'discussions', projectId, 'comments');
  await addDoc(colRef, {
    userId,
    displayName: displayName || 'Pengguna',
    text: text.trim(),
    replyToId: replyToId || null,
    createdAt: serverTimestamp(),
    edited: false,
  });
}

/**
 * Hapus komentar (hanya oleh pemilik atau admin)
 */
export async function deleteComment(projectId, commentId) {
  const ref = doc(db, 'discussions', projectId, 'comments', commentId);
  await deleteDoc(ref);
}

/**
 * Edit komentar
 */
export async function editComment(projectId, commentId, newText) {
  const ref = doc(db, 'discussions', projectId, 'comments', commentId);
  await updateDoc(ref, { text: newText.trim(), edited: true, editedAt: serverTimestamp() });
}

/**
 * Listen to comments for a project in real-time
 */
export function listenToComments(projectId, callback) {
  const colRef = collection(db, 'discussions', projectId, 'comments');
  const q = query(colRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(comments);
  }, (err) => {
    console.error('Error listening to discussions:', err);
    callback([]);
  });
}
