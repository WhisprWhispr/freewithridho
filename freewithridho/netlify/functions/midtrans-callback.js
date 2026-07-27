'use strict';
const crypto = require('crypto');
const admin = require('firebase-admin');

// Initialize Firebase Admin once
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const FALLBACK_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    let serverKey = FALLBACK_SERVER_KEY;
    if (admin.apps.length) {
      try {
        const db = admin.firestore();
        const settingsDoc = await db.collection('settings').doc('midtrans').get();
        if (settingsDoc.exists && settingsDoc.data().serverKey) {
          serverKey = settingsDoc.data().serverKey;
        }
      } catch (e) {
        console.warn('Could not read settings from Firestore:', e.message);
      }
    }

    if (!serverKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, message: 'Midtrans Server Key not configured' }),
      };
    }

    const data = JSON.parse(event.body);
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = data;

    // Verify Midtrans signature: SHA512(order_id + status_code + gross_amount + serverKey)
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

    console.log(`Callback — Order: ${order_id}, Status: ${transaction_status}`);

    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      if (admin.apps.length) {
        try {
          const db = admin.firestore();
          const snapshot = await db
            .collection('transactions')
            .where('merchantRef', '==', order_id)
            .get();

          if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            await db.collection('transactions').doc(docId).update({
              status: 'PAID',
              paidAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`✅ Transaction ${docId} updated to PAID`);
          } else {
            console.log(`❌ No transaction found for order: ${order_id}`);
          }
        } catch (e) {
          console.error('Firestore update error:', e.message);
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
