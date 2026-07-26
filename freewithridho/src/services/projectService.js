// Firestore service layer for all project-related operations
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  query,
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
 * Delete a project from Firestore by its document ID
 */
export async function deleteProject(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
