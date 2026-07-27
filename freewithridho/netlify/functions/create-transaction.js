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

// Midtrans config — URL auto-detected based on server key prefix
const FALLBACK_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const SITE_URL = process.env.URL || 'https://freewithridho.netlify.app';

function getMidtransUrl(serverKey) {
  const isSandbox = serverKey && (serverKey.startsWith('SB-') || serverKey.startsWith('sb-'));
  return isSandbox
    ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
    : 'https://app.midtrans.com/snap/v1/transactions';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    // Try to get server key from Firestore settings first
    let serverKey = FALLBACK_SERVER_KEY;
    if (admin.apps.length) {
      try {
        const db = admin.firestore();
        const settingsDoc = await db.collection('settings').doc('midtrans').get();
        if (settingsDoc.exists && settingsDoc.data().serverKey) {
          serverKey = settingsDoc.data().serverKey;
          console.log('✅ Using serverKey from Firestore settings');
        }
      } catch (e) {
        console.warn('Could not read settings from Firestore, using env key:', e.message);
      }
    }

    if (!serverKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, message: 'Midtrans Server Key not configured. Please set it in Admin Panel or Netlify environment variables.' }),
      };
    }

    const body = JSON.parse(event.body);
    const { projectId, userId, userEmail, projectTitle, amount } = body;

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
          name: (projectTitle || 'Source Code Premium').substring(0, 50),
        },
      ],
      callbacks: {
        finish: `${SITE_URL}/success`,
      },
    };

    const authString = Buffer.from(`${serverKey}:`).toString('base64');
    const MIDTRANS_URL = getMidtransUrl(serverKey);
    console.log('🌐 Midtrans URL:', MIDTRANS_URL);

    const midtransRes = await fetch(MIDTRANS_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    });

    const midtransData = await midtransRes.json();
    console.log('Midtrans response status:', midtransRes.status);

    if (!midtransRes.ok) {
      const errMsg = midtransData.error_messages
        ? midtransData.error_messages[0]
        : JSON.stringify(midtransData);
      console.error('Midtrans error:', errMsg);
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: errMsg }),
      };
    }

    // Auto-save transaction to Firestore as PENDING
    if (admin.apps.length) {
      try {
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
      } catch (e) {
        console.warn('Could not save to Firestore:', e.message);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        checkoutUrl: midtransData.redirect_url,
        reference: midtransData.token,
        merchantRef: orderId,
      }),
    };
  } catch (err) {
    console.error('create-transaction error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Internal server error: ' + err.message }),
    };
  }
};
