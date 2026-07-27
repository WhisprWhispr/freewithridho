// Firestore service layer for all project-related operations
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  doc,
  serverTimestamp,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'projects';

/**
 * Fetch all projects from Firestore, ordered by creation date (newest first)
 */
export async function getAllProjects() {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Fetch a single project by its Firestore document ID
 */
export async function getProjectById(id) {
  const ref = doc(db, COLLECTION, id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

/**
 * Add a new project to Firestore
 * @param {Object} projectData - { title, category, description, downloadUrl, readme }
 */
export async function addProject(projectData) {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...projectData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update an existing project in Firestore
 * @param {string} id - The document ID of the project
 * @param {Object} projectData - The data to update
 */
export async function updateProject(id, projectData) {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...projectData,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a project from Firestore by its document ID
 */
export async function deleteProject(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

/**
 * Check if a user has purchased a project (has a PAID transaction)
 */
export async function checkUserPurchase(userId, projectId) {
  if (!userId || !projectId) return false;
  
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    where('projectId', '==', projectId),
    where('status', '==', 'PAID')
  );
  
  try {
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking user purchase:", error);
    return false;
  }
}

/**
 * Get all transactions for a specific user, ordered by newest first
 */
export async function getUserTransactions(userId) {
  if (!userId) return [];
  
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return [];
  }
}

/**
 * Get settings document from Firestore
 */
export async function getSettings(docId) {
  const ref = doc(db, 'settings', docId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return snapshot.data();
}

/**
 * Save settings document to Firestore
 */
export async function saveSettings(docId, data) {
  const ref = doc(db, 'settings', docId);
  await setDoc(ref, data, { merge: true });
}
