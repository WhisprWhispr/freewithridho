import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

const COLLECTION_NAME = 'mosques';

// Get all mosques
export const getMosques = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting mosques:", error);
    throw error;
  }
};

// Add new mosque
export const addMosque = async (mosqueData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...mosqueData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding mosque:", error);
    throw error;
  }
};

// Update mosque
export const updateMosque = async (id, mosqueData) => {
  try {
    const mosqueRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(mosqueRef, {
      ...mosqueData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating mosque:", error);
    throw error;
  }
};

// Delete mosque
export const deleteMosque = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error("Error deleting mosque:", error);
    throw error;
  }
};
