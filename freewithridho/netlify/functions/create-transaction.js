const crypto = require('crypto');

// Tripay config from environment variables (set in Netlify dashboard)
const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY;
const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY;
const TRIPAY_MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE;
const TRIPAY_URL = process.env.TRIPAY_URL || 'https://tripay.co.id/api-sandbox/';
const SITE_URL = process.env.URL || 'http://localhost:8888'; // Netlify sets $URL automatically

// Generate Tripay HMAC Signature
const generateSignature = (merchantRef, amount) => {
  const str = `${TRIPAY_MERCHANT_CODE}${merchantRef}${amount}`;
  return crypto.createHmac('sha256', TRIPAY_PRIVATE_KEY).update(str).digest('hex');
};

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    const { projectId, userId, userEmail, projectTitle, amount } = JSON.parse(event.body);

    if (!projectId || !userId || !userEmail || !amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Data tidak lengkap.' }),
      };
    }

    const merchantRef = `TRX-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const signature = generateSignature(merchantRef, Number(amount));

    const payload = {
      method: 'QRIS',
      merchant_ref: merchantRef,
      amount: Number(amount),
      customer_name: userEmail.split('@')[0],
      customer_email: userEmail,
      customer_phone: '08123456789',
      order_items: [
        {
          sku: projectId,
          name: projectTitle || 'Source Code Premium',
          price: Number(amount),
          quantity: 1,
        },
      ],
      return_url: `${SITE_URL}/success`,
      expired_time: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 jam
      signature,
    };

    const tripayRes = await fetch(`${TRIPAY_URL}transaction/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TRIPAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const tripayData = await tripayRes.json();

    if (!tripayData.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: tripayData.message }),
      };
    }

    // TODO: Simpan ke Firestore via Admin SDK jika diperlukan
    // Contoh: set status UNPAID untuk referensi merchantRef di koleksi transactions

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        checkoutUrl: tripayData.data.checkout_url,
        reference: tripayData.data.reference,
        merchantRef,
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
