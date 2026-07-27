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

// Midtrans config from environment variables (fallback)
const FALLBACK_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const MIDTRANS_URL = process.env.MIDTRANS_URL || 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const SITE_URL = process.env.URL || 'http://localhost:5173'; // Netlify sets $URL automatically

export const handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    let serverKey = FALLBACK_SERVER_KEY;
    if (admin.apps.length) {
      const db = admin.firestore();
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
    const { projectId, userId, userEmail, projectTitle, amount } = JSON.parse(event.body);

    if (!projectId || !userId || !userEmail || !amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Data tidak lengkap.' }),
      };
    }

    const orderId = `TRX-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Number(amount),
      },
      customer_details: {
        first_name: userEmail.split('@')[0],
        email: userEmail,
      },
      item_details: [
        {
          id: projectId,
          price: Number(amount),
          quantity: 1,
          name: projectTitle || 'Source Code Premium',
        },
      ],
      callbacks: {
        finish: `${SITE_URL}/success`
      }
    };

    const authString = Buffer.from(`${serverKey}:`).toString('base64');

    const midtransRes = await fetch(MIDTRANS_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    });

    const midtransData = await midtransRes.json();

    if (!midtransRes.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: midtransData.error_messages ? midtransData.error_messages[0] : 'Failed to create transaction' }),
      };
    }

    // Auto-save transaction record to Firestore as PENDING
    if (admin.apps.length) {
      const db = admin.firestore();
      await db.collection('transactions').add({
        merchantRef: orderId,
        projectId,
        projectTitle: projectTitle || 'Source Code Premium',
        userId,
        userEmail,
        amount: Number(amount),
        status: 'PENDING',
        snapToken: midtransData.token || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ Transaction ${orderId} saved to Firestore`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        checkoutUrl: midtransData.redirect_url, // URL halaman Snap
        reference: midtransData.token,
        merchantRef: orderId,
      }),
    };
  } catch (err) {
    console.error('create-transaction error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Internal server error' }),
    };
  }
};
