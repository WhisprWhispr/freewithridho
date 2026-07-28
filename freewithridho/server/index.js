require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Firebase project config (public)
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'premium-f53eb';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCnOJJ5g6Ob2Ozo1WcvYARFzPthi133Qws';

// Inisialisasi Firebase Admin (opsional, untuk fitur lain seperti delete user)
let db = null;
try {
  let serviceAccount;
  let envVal = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envVal) {
    if (envVal.startsWith("'") && envVal.endsWith("'")) envVal = envVal.slice(1, -1);
    serviceAccount = JSON.parse(envVal);
  } else {
    serviceAccount = require('./serviceAccountKey.json');
  }
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('Firebase Admin initialized successfully');
  }
  db = admin.firestore();
} catch (error) {
  console.log('Warning: Firebase Admin not initialized:', error.message);
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Baca environment dari Firestore REST API (tanpa service account)
async function getMidtransConfig() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/midtrans?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Firestore REST error: ' + res.status);
    const data = await res.json();

    const environment = data.fields?.environment?.stringValue || 'sandbox';

    let serverKey;
    if (environment === 'production') {
      serverKey = process.env.MIDTRANS_SERVER_KEY_PRODUCTION;
      console.log('✅ Mode PRODUCTION — menggunakan MIDTRANS_SERVER_KEY_PRODUCTION');
    } else {
      serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX;
      console.log('✅ Mode SANDBOX — menggunakan MIDTRANS_SERVER_KEY_SANDBOX');
    }

    return { environment, serverKey };
  } catch (e) {
    console.warn('Gagal baca Firestore REST, fallback ke env vars:', e.message);
    const serverKey = process.env.MIDTRANS_SERVER_KEY_PRODUCTION || process.env.MIDTRANS_SERVER_KEY || null;
    const isSandbox = !serverKey || serverKey.includes('k_');
    return { environment: isSandbox ? 'sandbox' : 'production', serverKey };
  }
}

// 1. Endpoint: Create Transaction (Midtrans)
app.post('/api/create-transaction', async (req, res) => {
  const { projectId, userId, userEmail, projectTitle, amount } = req.body;

  if (!projectId || !userId || !userEmail || !amount) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
  }

  try {
    const { environment, serverKey } = await getMidtransConfig();

    if (!serverKey) {
      return res.status(500).json({ success: false, message: 'Midtrans Server Key tidak ditemukan. Tambahkan MIDTRANS_SERVER_KEY_SANDBOX / MIDTRANS_SERVER_KEY_PRODUCTION di file .env' });
    }

    const isSandbox = environment === 'sandbox';
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
      ],
      enabled_payments: ["other_qris"],
      callbacks: {
        finish: req.headers.origin + '/success',
        unfinish: req.headers.origin + '/checkout/' + projectId,
        error: req.headers.origin + '/checkout/' + projectId,
      }
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
