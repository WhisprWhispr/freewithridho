import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

export const listenToFeedbacks = (callback) => {
  const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const feedbacks = [];
    snapshot.forEach((doc) => {
      feedbacks.push({ id: doc.id, ...doc.data() });
    });
    callback(feedbacks);
  }, (error) => {
    console.error("Error fetching feedbacks:", error);
  });
};

export const deleteFeedback = async (id) => {
  try {
    await deleteDoc(doc(db, 'feedbacks', id));
    return true;
  } catch (error) {
    console.error("Error deleting feedback:", error);
    throw error;
  }
};
