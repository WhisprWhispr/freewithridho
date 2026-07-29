import { db } from '../firebase';
import {
  doc, getDoc, setDoc, updateDoc, increment,
  collection, query, where, getDocs, onSnapshot
} from 'firebase/firestore';

// Generate a unique referral code from userId
export function generateReferralCode(userId) {
  const part1 = userId.slice(0, 4).toUpperCase();
  const part2 = userId.slice(-4).toUpperCase();
  return `REF-${part1}${part2}`;
}

// Ensure user has a referralCode in their profile, create if missing
export async function ensureReferralCode(userId) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const code = generateReferralCode(userId);
    await setDoc(userRef, {
      uid: userId,
      referralCode: code,
      referralBalance: 0,
      referralCount: 0,
    }, { merge: true });
    return code;
  }

  const data = snap.data();
  if (!data.referralCode) {
    const code = generateReferralCode(userId);
    await updateDoc(userRef, { referralCode: code, referralBalance: 0, referralCount: 0 });
    return code;
  }

  return data.referralCode;
}

// Get user profile data (includes referral info)
export async function getUserProfile(userId) {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Real-time listener for user profile (referral balance, count, etc)
export function listenToUserProfile(userId, callback) {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null);
    }
  });
}

// Validate referral code — find owner, return their userId
export async function validateReferralCode(code, buyerUserId) {
  if (!code || code.trim() === '') return { valid: false, message: 'Kode referral kosong.' };

  const q = query(collection(db, 'users'), where('referralCode', '==', code.trim().toUpperCase()));
  const snap = await getDocs(q);

  if (snap.empty) return { valid: false, message: 'Kode referral tidak ditemukan.' };

  const owner = snap.docs[0];
  if (owner.id === buyerUserId) {
    return { valid: false, message: 'Tidak bisa memakai kode referral sendiri.' };
  }

  return {
    valid: true,
    ownerUserId: owner.id,
    ownerName: owner.data().displayName || 'Pengguna',
    message: `Kode valid! Referral dari: ${owner.data().displayName || owner.data().referralCode}`,
  };
}

// (Old percentage functions removed)

// (Old percentage functions removed)

// Save a referral code to a user's profile so it auto-applies on checkout
export async function saveReferredBy(userId, code) {
  if (!code || code.trim() === '') return { valid: false, message: 'Kode referral kosong.' };
  
  // Validate the code first
  const validation = await validateReferralCode(code, userId);
  if (!validation.valid) {
    return validation;
  }
  
  // Save it to user profile
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    referredBy: code.trim().toUpperCase(),
    referredByUserId: validation.ownerUserId
  });
  
  // IMMEDIATELY CREDIT THE COMMISSION (FIXED AMOUNT e.g. Rp 250)
  const FIXED_COMMISSION = 250;
  
  // 1. Credit general user referral balance
  const ownerUserRef = doc(db, 'users', validation.ownerUserId);
  try {
    await updateDoc(ownerUserRef, {
      referralBalance: increment(FIXED_COMMISSION),
      referralCount: increment(1),
    });
  } catch (e) {
    console.error('Failed to credit general user referral balance:', e);
  }

  // 2. Credit partner affiliate balance (if they are a partner)
  try {
    const q = query(collection(db, 'partners'), where('userId', '==', validation.ownerUserId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const partnerRef = doc(db, 'partners', snap.docs[0].id);
      await updateDoc(partnerRef, {
        affiliateBalance: increment(FIXED_COMMISSION),
        affiliateCount: increment(1),
        balance: increment(FIXED_COMMISSION) // Add to withdrawable balance
      });
    }
  } catch (e) {
    console.error('Failed to credit partner affiliate balance:', e);
  }
  
  return { valid: true, message: 'Kode referral berhasil disimpan! Komisi otomatis diberikan kepada pengundang.' };
}
