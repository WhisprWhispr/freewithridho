const crypto = require('crypto');

const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    const callbackSignature = event.headers['x-callback-signature'];
    const rawBody = event.body;

    // Verify signature from Tripay
    const expectedSignature = crypto
      .createHmac('sha256', TRIPAY_PRIVATE_KEY)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== callbackSignature) {
      console.error('Invalid Tripay signature!');
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Invalid signature' }),
      };
    }

    const data = JSON.parse(rawBody);

    if (data.event !== 'payment_status') {
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    const { reference, merchant_ref, status } = data;

    console.log(`Callback received — Ref: ${reference}, Status: ${status}`);

    if (status === 'PAID') {
      console.log(`✅ Payment PAID for ref: ${reference} (merchant_ref: ${merchant_ref})`);

      // TODO: Update Firestore transaction status to PAID via Admin SDK
      // const admin = require('firebase-admin');
      // if (!admin.apps.length) {
      //   admin.initializeApp({
      //     credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
      //   });
      // }
      // const db = admin.firestore();
      // await db.collection('transactions').doc(merchant_ref).update({
      //   status: 'PAID',
      //   paidAt: admin.firestore.FieldValue.serverTimestamp(),
      // });
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
