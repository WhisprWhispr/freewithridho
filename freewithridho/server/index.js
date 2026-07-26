require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
// const admin = require('firebase-admin');

// Initialize Firebase Admin (Uncomment and configure to use)
// const serviceAccount = require('./serviceAccountKey.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });
// const db = admin.firestore();

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
  const signatureStr = `${TRIPAY_MERCHANT_CODE}${merchantRef}${amount}`;
  return crypto.createHmac('sha256', TRIPAY_PRIVATE_KEY).update(signatureStr).digest('hex');
};

// 1. Endpoint: Create Transaction
app.post('/api/create-transaction', async (req, res) => {
  const { projectId, userId, userEmail } = req.body;

  try {
    // In a real app, you MUST fetch the project price from Firestore securely here
    // For example:
    // const projectDoc = await db.collection('projects').doc(projectId).get();
    // const project = projectDoc.data();
    // const amount = project.price;

    // For demo purposes, we'll hardcode an amount if not fetching from DB
    const amount = 50000; // MUST REPLACE WITH DB FETCH

    const merchantRef = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const signature = generateSignature(merchantRef, amount);

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

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
