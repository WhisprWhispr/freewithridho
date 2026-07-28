require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
// Initialize Firebase Admin (Requires serviceAccountKey.json in the server folder)
const admin = require('firebase-admin');
try {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
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

// 1. Endpoint: Create Transaction
app.post('/api/create-transaction', async (req, res) => {
  const { projectId, userId, userEmail } = req.body;

  try {
    // In a real app, you MUST fetch the project price from Firestore securely here
    const amount = 50000; // MUST REPLACE WITH DB FETCH

    const merchantRef = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const signature = generateSignature(merchantRef, amount);

    // DUMMY MODE IF NO REAL KEY IS PROVIDED
    if (!TRIPAY_API_KEY || TRIPAY_API_KEY === 'YOUR_TRIPAY_API_KEY') {
      console.log('Using dummy payment mode because TRIPAY_API_KEY is not set');
      return res.json({
        success: true,
        checkoutUrl: `http://localhost:5173/success?reference=${merchantRef}`, 
        reference: merchantRef
      });
    }

    const payload = {
      method: 'QRIS', // Defaulting to QRIS for demo, you can pass this from frontend
      merchant_ref: merchantRef,
      amount: amount,
      customer_name: userEmail.split('@')[0],
      customer_email: userEmail,
      customer_phone: '081234567890',
      order_items: [
        {
          sku: projectId,
          name: 'Source Code Premium',
          price: amount,
          quantity: 1,
        }
      ],
      return_url: `http://localhost:5173/success`,
      expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      signature: signature
    };

    const response = await fetch(`${TRIPAY_URL}transaction/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TRIPAY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const tripayData = await response.json();

    if (!tripayData.success) {
      return res.status(400).json({ success: false, message: tripayData.message });
    }

    // Save transaction to Firestore as UNPAID
    // await db.collection('transactions').doc(merchantRef).set({
    //   reference: tripayData.data.reference,
    //   merchantRef,
    //   projectId,
    //   userId,
    //   userEmail,
    //   amount,
    //   status: 'UNPAID',
    //   createdAt: admin.firestore.FieldValue.serverTimestamp()
    // });

    res.json({
      success: true,
      checkoutUrl: tripayData.data.checkout_url,
      reference: tripayData.data.reference
    });

  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
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
