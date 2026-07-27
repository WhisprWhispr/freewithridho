import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDoc
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

/**
 * Get partner details by user ID
 */
export function listenToPartnerByUserId(userId, callback) {
  if (!userId) {
    callback(null);
    return () => {};
  }
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const docData = snapshot.docs[0];
      callback({ id: docData.id, ...docData.data() });
    }
  }, (err) => {
    console.error('Error getting partner info:', err);
    callback(null);
  });
}

const WITHDRAWALS_COLLECTION = 'withdrawals';

export async function submitWithdrawal(data) {
  const colRef = collection(db, WITHDRAWALS_COLLECTION);
  await addDoc(colRef, {
    ...data,
    status: 'pending',
    requestedAt: new Date().toISOString()
  });
}

export function listenToWithdrawals(callback) {
  const q = query(collection(db, WITHDRAWALS_COLLECTION), orderBy('requestedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(data);
  }, (err) => {
    console.error('Error listening to withdrawals:', err);
    callback([]);
  });
}

export async function completeWithdrawal(withdrawalId, partnerId, amount) {
  // Update withdrawal status
  const withdrawalRef = doc(db, WITHDRAWALS_COLLECTION, withdrawalId);
  await updateDoc(withdrawalRef, { status: 'completed' });
  
  // Deduct from partner balance
  const partnerRef = doc(db, COLLECTION, partnerId);
  const partnerSnap = await getDoc(partnerRef);
  if (partnerSnap.exists()) {
    const currentBalance = partnerSnap.data().balance || 0;
    await updateDoc(partnerRef, {
      balance: currentBalance - amount
    });
  }
}
