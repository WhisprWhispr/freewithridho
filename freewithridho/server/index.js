require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
// Initialize Firebase Admin (Requires serviceAccountKey.json in the server folder)
const admin = require('firebase-admin');
try {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    let envVal = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (envVal.startsWith("'") && envVal.endsWith("'")) {
       envVal = envVal.slice(1, -1);
    }
    serviceAccount = JSON.parse(envVal);
  } else {
    serviceAccount = require('./serviceAccountKey.json');
  }
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  }
} catch (error) {
  console.log('Warning: Firebase Admin not initialized. Missing serviceAccountKey.json or FIREBASE_SERVICE_ACCOUNT env var.');
  console.error('Initialization error details:', error.message);
}

const db = (admin.apps && admin.apps.length) ? admin.firestore() : null;

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY;
const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY;
const TRIPAY_MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE;
const TRIPAY_URL = process.env.TRIPAY_URL || 'https://tripay.co.id/api-sandbox/';

// Utility to create Tripay Signature
const generateSignature = (merchantRef, amount) => {
  if (!TRIPAY_PRIVATE_KEY || TRIPAY_PRIVATE_KEY === 'YOUR_TRIPAY_PRIVATE_KEY') return 'dummy-signature';
  const signatureStr = `${TRIPAY_MERCHANT_CODE}${merchantRef}${amount}`;
  return crypto.createHmac('sha256', TRIPAY_PRIVATE_KEY).update(signatureStr).digest('hex');
};

// 1. Endpoint: Create Transaction (Midtrans)
app.post('/api/create-transaction', async (req, res) => {
  const { projectId, userId, userEmail, projectTitle, amount } = req.body;

  if (!projectId || !userId || !userEmail || !amount) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
  }

  try {
    let serverKey = process.env.MIDTRANS_SERVER_KEY;
    let environment = 'sandbox';

    if (db) {
      try {
        const settingsDoc = await db.collection('settings').doc('midtrans').get();
        if (settingsDoc.exists) {
          if (settingsDoc.data().serverKey) serverKey = settingsDoc.data().serverKey;
          if (settingsDoc.data().environment) environment = settingsDoc.data().environment;
        }
      } catch (e) {
        console.warn('Could not read settings from Firestore:', e.message);
      }
    }

    if (!serverKey) {
      return res.status(500).json({ success: false, message: 'Midtrans Server Key not configured in Admin Panel.' });
    }

    let isSandbox = environment === 'sandbox';
    if (!environment) {
       isSandbox = serverKey.startsWith('SB-') || serverKey.startsWith('sb-');
    }
    const MIDTRANS_URL = isSandbox 
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions' 
      : 'https://app.midtrans.com/snap/v1/transactions';

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
          name: (projectTitle || 'Source Code').substring(0, 50),
        }
      ]
    };

    const authString = Buffer.from(`${serverKey}:`).toString('base64');
    
    // Gunakan global fetch (Node 18+)
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

    if (!midtransRes.ok) {
      const errMsg = midtransData.error_messages ? midtransData.error_messages[0] : JSON.stringify(midtransData);
      return res.status(400).json({ success: false, message: errMsg });
    }

    // Auto-save transaction to Firestore as PENDING
    if (db) {
      await db.collection('transactions').add({
        merchantRef: orderId,
        projectId,
        projectTitle: projectTitle || 'Source Code',
        userId,
        userEmail,
        amount: Number(amount),
        status: 'PENDING',
        snapToken: midtransData.token || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.json({
      success: true,
      checkoutUrl: midtransData.redirect_url,
      reference: midtransData.token,
      merchantRef: orderId
    });

  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
});

// 2. Endpoint: Tripay Callback (Webhook)
app.post('/api/tripay-callback', async (req, res) => {
  try {
    const callbackSignature = req.headers['x-callback-signature'];
    const json = req.body;

    // Validate Signature
    const signature = crypto.createHmac('sha256', TRIPAY_PRIVATE_KEY)
      .update(JSON.stringify(json))
      .digest('hex');

    if (signature !== callbackSignature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    if (json.event !== 'payment_status') {
      return res.status(200).json({ success: true });
    }

    const { reference, merchant_ref, status } = json;

    // If payment is PAID, update Firestore
    if (status === 'PAID') {
      console.log(`Payment success for Ref: ${reference}`);
      // await db.collection('transactions').doc(merchant_ref).update({
      //   status: 'PAID',
      //   paidAt: admin.firestore.FieldValue.serverTimestamp()
      // });
      
      // Opt: Send email to user with download link here
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// 3. Endpoint: Delete Firebase Auth User (Used by Admin Panel when Banning Partner)
app.post('/api/delete-user', async (req, res) => {
  if (!admin.apps.length) {
    return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized on backend' });
  }

  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Missing userId' });
    }

    // Delete the user from Firebase Auth
    await admin.auth().deleteUser(userId);
    console.log(`Successfully deleted user auth account: ${userId}`);

    res.json({ success: true, message: 'User auth account deleted.' });
  } catch (error) {
    console.error('Error deleting user auth:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
