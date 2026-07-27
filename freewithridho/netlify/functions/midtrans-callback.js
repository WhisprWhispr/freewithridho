import crypto from 'crypto';
import admin from 'firebase-admin';

// Initialize Firebase Admin once
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const FALLBACK_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    let serverKey = FALLBACK_SERVER_KEY;
    const db = admin.firestore();
    if (admin.apps.length) {
      const settingsDoc = await db.collection('settings').doc('midtrans').get();
      if (settingsDoc.exists && settingsDoc.data().serverKey) {
        serverKey = settingsDoc.data().serverKey;
      }
    }

    if (!serverKey) {
       return {
        statusCode: 500,
        body: JSON.stringify({ success: false, message: 'Midtrans Server Key not configured' }),
      };
    }

    const rawBody = event.body;
    const data = JSON.parse(rawBody);

    const { order_id, status_code, gross_amount, signature_key, transaction_status } = data;

    // Verify signature from Midtrans
    // SHA512(order_id+status_code+gross_amount+ServerKey)
    const expectedSignature = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');

    if (expectedSignature !== signature_key) {
      console.error('Invalid Midtrans signature!');
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Invalid signature' }),
      };
    }

    console.log(`Callback received — Order ID: ${order_id}, Status: ${transaction_status}`);

    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      console.log(`✅ Payment PAID for order: ${order_id}`);

      if (admin.apps.length) {
        // Find transaction by orderId / merchantRef
        // Since we don't have the transaction document ID directly, we query by merchantRef
        const transactionsRef = db.collection('transactions');
        const q = transactionsRef.where('merchantRef', '==', order_id);
        const snapshot = await q.get();

        if (!snapshot.empty) {
          const docId = snapshot.docs[0].id;
          await transactionsRef.doc(docId).update({
            status: 'PAID',
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`✅ Firestore transaction ${docId} updated to PAID`);
        } else {
           console.log(`❌ Transaction not found in Firestore for order: ${order_id}`);
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Callback error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Internal server error' }),
    };
  }
};
