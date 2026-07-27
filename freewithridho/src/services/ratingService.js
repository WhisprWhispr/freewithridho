import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'ratings';

/**
 * Submit or update a user's rating (1-5)
 * @param {string} userId - User's Firebase Auth UID
 * @param {number} ratingValue - Number from 1 to 5
 */
export async function submitRating(userId, ratingValue) {
  if (!userId) throw new Error('User must be logged in to rate.');
  if (ratingValue < 1 || ratingValue > 5) throw new Error('Rating must be between 1 and 5.');

  const ratingDocRef = doc(db, COLLECTION, userId);
  await setDoc(ratingDocRef, {
    userId,
    rating: ratingValue,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Listen to all ratings to calculate the average and total count in real-time
 * @param {function} callback - Called with { average, totalCount }
 * @returns unsubscribe function
 */
export function listenToAvgRating(callback) {
  const colRef = collection(db, COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const ratings = snapshot.docs.map((doc) => doc.data().rating);
    const totalCount = ratings.length;
    
    // Default to 4.9 if no ratings exist (as per previous hardcoded value)
    let average = 4.9; 
    
    if (totalCount > 0) {
      const sum = ratings.reduce((acc, curr) => acc + curr, 0);
      average = sum / totalCount;
    }

    callback({ average, totalCount });
  }, (err) => {
    console.error('Error listening to ratings:', err);
    callback({ average: 4.9, totalCount: 0 });
  });
}
