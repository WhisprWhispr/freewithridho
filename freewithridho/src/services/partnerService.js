import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'partners';

/**
 * Submit a new partner application
 */
export async function submitPartnerApplication(data) {
  const colRef = collection(db, COLLECTION);
  await addDoc(colRef, {
    ...data,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    reviewedAt: null
  });
}

/**
 * Listen to all partner applications (for Admin Panel)
 */
export function listenToPartners(callback) {
  const q = query(collection(db, COLLECTION), orderBy('submittedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(data);
  }, (err) => {
    console.error('Error listening to partners:', err);
    callback([]);
  });
}

/**
 * Update partner status (Approve / Reject)
 */
export async function updatePartnerStatus(id, newStatus) {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: newStatus,
    reviewedAt: new Date().toISOString()
  });
}

/**
 * Listen to total approved developers count (Real-time for Home)
 */
export function listenToApprovedDevCount(callback) {
  const q = query(collection(db, COLLECTION), where('status', '==', 'approved'));
  return onSnapshot(q, (snapshot) => {
    // Add 1000 to the count to simulate a large community, as the static value was 1K+
    const actualCount = snapshot.docs.length;
    callback(1000 + actualCount);
  }, (err) => {
    console.error('Error getting dev count:', err);
    callback(1000);
  });
}
