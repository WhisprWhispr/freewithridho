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
    const actualCount = snapshot.docs.length;
    // Add +1 so it includes the Admin as the first developer
    callback(1 + actualCount);
  }, (err) => {
    console.error('Error getting dev count:', err);
    callback(1);
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
  const feeRate = data.amount < 500000 ? 0.05 : 0.10;
  const feeAmount = Math.floor(data.amount * feeRate);
  const netAmount = data.amount - feeAmount;

  await addDoc(colRef, {
    ...data,
    feeRate,
    feeAmount,
    netAmount,
    status: 'pending',
    requestedAt: new Date().toISOString()
  });

  // Deduct from partner balance immediately to hold funds
  const partnerRef = doc(db, COLLECTION, data.partnerId);
  const partnerSnap = await getDoc(partnerRef);
  if (partnerSnap.exists()) {
    const currentBalance = partnerSnap.data().balance || 0;
    await updateDoc(partnerRef, {
      balance: currentBalance - data.amount
    });
  }
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

export async function completeWithdrawal(withdrawalId, partnerId, amount, feeAmount) {
  // Update withdrawal status
  const withdrawalRef = doc(db, WITHDRAWALS_COLLECTION, withdrawalId);
  await updateDoc(withdrawalRef, { status: 'completed' });
  
  // Add fee to admin wallet
  if (feeAmount > 0) {
    const adminWalletRef = doc(db, 'settings', 'adminWallet');
    const adminWalletDoc = await getDoc(adminWalletRef);
    const currentBalance = adminWalletDoc.exists() ? (adminWalletDoc.data().balance || 0) : 0;
    await updateDoc(adminWalletRef, {
      balance: currentBalance + feeAmount
    }).catch(async (e) => {
      // If document doesn't exist, set it
      if (e.code === 'not-found') {
        await setDoc(adminWalletRef, { balance: feeAmount });
      }
    });
  }
}

/**
 * Ban Partner: Delete their projects, partner document, and Firebase Auth account
 */
export async function banPartner(partnerId, userId) {
  const { getDocs, deleteDoc } = await import('firebase/firestore');
  const { getAuth } = await import('firebase/auth');
  
  // Find and delete all projects by this user
  if (userId) {
    const q = query(collection(db, 'projects'), where('ownerId', '==', userId));
    const snapshots = await getDocs(q);
    const deletePromises = snapshots.docs.map(d => deleteDoc(doc(db, 'projects', d.id)));
    await Promise.all(deletePromises);
  }

  // Delete the partner document completely
  const docRef = doc(db, COLLECTION, partnerId);
  await deleteDoc(docRef);

  // Call backend to delete the Firebase Auth user account
  if (userId) {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        const response = await fetch('/.netlify/functions/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ userId })
        });
        
        if (!response.ok) {
          console.error('Failed to delete auth user, status:', response.status);
        }
      }
    } catch (e) {
      console.error('Error calling delete-user function:', e);
    }
  }
}

/**
 * Suspend Partner: Temporarily disable account
 */
export async function suspendPartner(partnerId) {
  const docRef = doc(db, COLLECTION, partnerId);
  await updateDoc(docRef, {
    status: 'suspended',
    appealRequested: false,
    suspendedAt: new Date().toISOString()
  });
}

/**
 * Appeal Suspension: Partner requests review
 */
export async function appealSuspension(partnerId) {
  const docRef = doc(db, COLLECTION, partnerId);
  await updateDoc(docRef, {
    appealRequested: true,
    appealedAt: new Date().toISOString()
  });
}

/**
 * Restore Partner: Admin restores suspended account
 */
export async function restorePartner(partnerId) {
  const docRef = doc(db, COLLECTION, partnerId);
  await updateDoc(docRef, {
    status: 'approved',
    appealRequested: false,
    restoredAt: new Date().toISOString()
  });
}
