// Firebase project config — loaded from Netlify Environment Variables
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;

const SITE_URL = process.env.URL || 'https://freewithridho.netlify.app';

// Polyfill fetch untuk Node.js < 18
const fetchFn = typeof fetch !== 'undefined' ? fetch : null;

// Baca environment dari Firestore REST API (tanpa service account)
async function getInstanpayConfig() {
  try {
    if (!fetchFn) throw new Error('fetch not available');
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/instanpay?key=${FIREBASE_API_KEY}`;
    const res = await fetchFn(url);
    if (!res.ok) throw new Error('Firestore REST API error: ' + res.status);
    const data = await res.json();

    const apiKey = data.fields?.apiKey?.stringValue;
    if (apiKey) return apiKey;

    throw new Error('API Key tidak ditemukan di Firestore');
  } catch (e) {
    console.warn('Gagal baca Firestore, fallback ke env vars:', e.message);
    return process.env.INSTANPAY_API_KEY || null;
  }
}

// ✅ ESM format — kompatibel dengan Netlify CLI v17+
export const handler = async (event) => {
  // CORS headers untuk dev lokal
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    if (!fetchFn) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Node.js versi terlalu lama. Gunakan Node.js 18+ untuk mendukung fetch.',
        }),
      };
    }

    // Dapatkan konfigurasi Instanpay
    const apiKey = await getInstanpayConfig();

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message:
            'Instanpay API Key tidak ditemukan. Tambahkan INSTANPAY_API_KEY di Netlify Environment Variables atau di Admin Panel.',
        }),
      };
    }

    const INSTANPAY_URL = 'https://instanpay.net/api/v1/payments';

    const body = JSON.parse(event.body);
    const { projectId, userId, userEmail, projectTitle, amount } = body;

    if (!projectId || !userId || !userEmail || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'Data tidak lengkap.' }),
      };
    }

    const payload = {
      amount: Number(amount),
      customer_name: userEmail.split('@')[0],
      webhook_url: `${SITE_URL}/.netlify/functions/instanpay-webhook`
    };

    console.log('🌐 Instanpay URL:', INSTANPAY_URL);

    const instanpayRes = await fetchFn(INSTANPAY_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const instanpayData = await instanpayRes.json();
    console.log('Instanpay response status:', instanpayRes.status);

    if (!instanpayRes.ok || !instanpayData.success) {
      const errMsg = instanpayData.message || JSON.stringify(instanpayData);
      console.error('Instanpay error:', errMsg);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: errMsg }),
      };
    }

    const txData = instanpayData.data;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reference: txData.transactionId,
        merchantRef: txData.transactionId, // Using Instanpay's txId as our reference
        qrCodeSvg: txData.qrCodeSvg,
        qrisString: txData.qrisString,
        totalAmount: txData.totalAmount,
        totalFormatted: txData.totalFormatted,
        expiredAt: txData.expiredAt,
        baseAmount: txData.baseAmount,
      }),
    };
  } catch (err) {
    console.error('create-transaction error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: 'Internal server error: ' + err.message }),
    };
  }
};
