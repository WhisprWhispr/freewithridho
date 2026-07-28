'use strict';

// Firebase project config (public — same as frontend)
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'premium-f53eb';
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCnOJJ5g6Ob2Ozo1WcvYARFzPthi133Qws';

const SITE_URL = process.env.URL || 'https://freewithridho.netlify.app';

// Baca environment dari Firestore REST API (tanpa service account)
async function getMidtransConfig() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/midtrans?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Firestore REST API error: ' + res.status);
    const data = await res.json();

    const environment = data.fields?.environment?.stringValue || 'sandbox';
    const clientKey = data.fields?.clientKey?.stringValue || '';

    // Pilih server key dari env vars berdasarkan environment
    let serverKey;
    if (environment === 'production') {
      serverKey = process.env.MIDTRANS_SERVER_KEY_PRODUCTION;
      console.log('✅ Mode PRODUCTION — menggunakan MIDTRANS_SERVER_KEY_PRODUCTION');
    } else {
      serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX;
      console.log('✅ Mode SANDBOX — menggunakan MIDTRANS_SERVER_KEY_SANDBOX');
    }

    return { environment, serverKey, clientKey };
  } catch (e) {
    console.warn('Gagal baca Firestore, fallback ke env vars:', e.message);
    // Fallback: cek env var lama
    const serverKey = process.env.MIDTRANS_SERVER_KEY_PRODUCTION || process.env.MIDTRANS_SERVER_KEY || null;
    const isSandbox = !serverKey || serverKey.startsWith('Mid-server-k') || serverKey.startsWith('SB-');
    return { environment: isSandbox ? 'sandbox' : 'production', serverKey };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    // Dapatkan konfigurasi Midtrans (environment + server key)
    const { environment, serverKey } = await getMidtransConfig();

    if (!serverKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, message: `Midtrans Server Key tidak ditemukan. Tambahkan MIDTRANS_SERVER_KEY_SANDBOX dan MIDTRANS_SERVER_KEY_PRODUCTION di Netlify Environment Variables.` }),
      };
    }

    const isSandbox = environment === 'sandbox';
    const MIDTRANS_URL = isSandbox
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
      : 'https://app.midtrans.com/snap/v1/transactions';

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
    console.log('🌐 Midtrans URL:', MIDTRANS_URL, '| Environment:', environment);

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

    // Transaction akan disimpan ke Firestore oleh midtrans-callback webhook setelah pembayaran sukses

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
