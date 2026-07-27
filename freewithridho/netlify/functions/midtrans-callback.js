const crypto = require('crypto');

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    const rawBody = event.body;
    const data = JSON.parse(rawBody);

    const { order_id, status_code, gross_amount, signature_key, transaction_status } = data;

    // Verify signature from Midtrans
    // SHA512(order_id+status_code+gross_amount+ServerKey)
    const expectedSignature = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`)
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

      // TODO: Update Firestore transaction status to PAID via Admin SDK
      // const admin = require('firebase-admin');
      // if (!admin.apps.length) {
      //   admin.initializeApp({
      //     credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
      //   });
      // }
      // const db = admin.firestore();
      // await db.collection('transactions').doc(order_id).update({
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
