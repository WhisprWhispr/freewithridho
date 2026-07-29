// Promo Code Service — Firestore: promoCodes/{code}
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Validate promo code and return discount info
 * @returns { valid, type, value, message, code }
 *   type: 'percent' | 'fixed'
 *   value: discount value (20 means 20%, 5000 means Rp5000 off)
 */
export async function validatePromoCode(code, originalAmount) {
  if (!code || !code.trim()) return { valid: false, message: 'Kode promo tidak boleh kosong.' };

  try {
    const ref = doc(db, 'promoCodes', code.trim().toUpperCase());
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { valid: false, message: 'Kode promo tidak ditemukan.' };
    }

    const promo = snap.data();

    if (!promo.active) {
      return { valid: false, message: 'Kode promo sudah tidak aktif.' };
    }

    // Check expiry
    if (promo.expiresAt) {
      const expiry = promo.expiresAt.toDate ? promo.expiresAt.toDate() : new Date(promo.expiresAt);
      if (expiry < new Date()) {
        return { valid: false, message: 'Kode promo sudah kedaluwarsa.' };
      }
    }

    // Check usage limit
    if (promo.maxUsage && promo.usageCount >= promo.maxUsage) {
      return { valid: false, message: 'Kode promo sudah mencapai batas penggunaan.' };
    }

    // Check minimum purchase
    if (promo.minPurchase && originalAmount < promo.minPurchase) {
      return {
        valid: false,
        message: `Minimum pembelian Rp ${promo.minPurchase.toLocaleString('id-ID')} untuk kode ini.`
      };
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.type === 'percent') {
      discountAmount = Math.floor(originalAmount * promo.value / 100);
    } else if (promo.type === 'fixed') {
      discountAmount = Math.min(promo.value, originalAmount - 1000); // Min final price Rp 1000
    }
    discountAmount = Math.max(0, discountAmount);
    const finalAmount = Math.max(1000, originalAmount - discountAmount);

    return {
      valid: true,
      type: promo.type,
      value: promo.value,
      discountAmount,
      finalAmount,
      description: promo.description || '',
      message: `✅ Promo "${code.toUpperCase()}" berhasil! Hemat Rp ${discountAmount.toLocaleString('id-ID')}`,
      code: code.trim().toUpperCase(),
    };
  } catch (err) {
    console.error('Error validating promo:', err);
    return { valid: false, message: 'Gagal memvalidasi kode promo.' };
  }
}
