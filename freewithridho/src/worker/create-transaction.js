// Baca environment dari Firestore REST API (tanpa service account)
async function getInstanpayConfig(env) {
  try {
    const FIREBASE_PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID;
    const FIREBASE_API_KEY = env.VITE_FIREBASE_API_KEY;
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/instanpay?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Firestore REST API error: ' + res.status);
    const data = await res.json();

    const apiKey = data.fields?.apiKey?.stringValue;
    if (apiKey) return apiKey;

    throw new Error('API Key tidak ditemukan di Firestore');
  } catch (e) {
    console.warn('Gagal baca Firestore, fallback ke env vars:', e.message);
    return env.INSTANPAY_API_KEY || null;
  }
}

export async function createTransaction(request, env) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const SITE_URL = env.URL || new URL(request.url).origin;

    // Dapatkan konfigurasi Instanpay
    const apiKey = await getInstanpayConfig(env);

    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Instanpay API Key tidak ditemukan. Tambahkan INSTANPAY_API_KEY di Cloudflare Variables atau di Admin Panel.',
      }), { status: 500, headers });
    }

    const body = await request.json();
    const { projectId, userId, userEmail, projectTitle, amount, paymentMethod, chain, token } = body;

    if (!projectId || !userId || !userEmail || !amount) {
      return new Response(JSON.stringify({ success: false, message: 'Data tidak lengkap.' }), { status: 400, headers });
    }

    if (paymentMethod === 'crypto') {
      const CRYPTO_URL = 'https://instanpay.net/api/v1/crypto-payments';
      
      const USD_RATE = 15000;
      let amountUsd = Number(amount) / USD_RATE;
      if (amountUsd < 0.01) amountUsd = 0.01;
      amountUsd = parseFloat(amountUsd.toFixed(2));

      const payload = {
        amount_usd: amountUsd,
        chain: chain || 'BSC',
        token: token || 'USDT',
        customer_name: userEmail.split('@')[0],
        customer_email: userEmail
      };

      console.log('🌐 Instanpay Crypto URL:', CRYPTO_URL);

      const instanpayRes = await fetch(CRYPTO_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const instanpayData = await instanpayRes.json();

      if (!instanpayRes.ok || !instanpayData.success) {
        const errMsg = instanpayData.message || JSON.stringify(instanpayData);
        console.error('Instanpay Crypto error:', errMsg);
        return new Response(JSON.stringify({ success: false, message: errMsg }), { status: 400, headers });
      }

      const txData = instanpayData.data;

      return new Response(JSON.stringify({
        success: true,
        reference: txData.transactionId,
        merchantRef: txData.transactionId,
        gatewayOrderId: txData.gatewayOrderId,
        amount_usd: txData.amount_usd,
        chain: txData.chain,
        token: txData.token,
        deposit_address: txData.deposit_address,
        payment_url: txData.payment_url,
        expiredAt: txData.expires_at,
        paymentMethod: 'crypto',
      }), { status: 200, headers });
    } else {
      // Default: QRIS
      const INSTANPAY_URL = 'https://instanpay.net/api/v1/payments';

      const payload = {
        amount: Number(amount),
        customer_name: userEmail.split('@')[0],
        webhook_url: `${SITE_URL}/.netlify/functions/instanpay-webhook`
      };

      console.log('🌐 Instanpay QRIS URL:', INSTANPAY_URL);

      const instanpayRes = await fetch(INSTANPAY_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const instanpayData = await instanpayRes.json();

      if (!instanpayRes.ok || !instanpayData.success) {
        const errMsg = instanpayData.message || JSON.stringify(instanpayData);
        console.error('Instanpay QRIS error:', errMsg);
        return new Response(JSON.stringify({ success: false, message: errMsg }), { status: 400, headers });
      }

      const txData = instanpayData.data;

      return new Response(JSON.stringify({
        success: true,
        reference: txData.transactionId,
        merchantRef: txData.transactionId,
        qrCodeSvg: txData.qrCodeSvg,
        qrisString: txData.qrisString,
        totalAmount: txData.totalAmount,
        totalFormatted: txData.totalFormatted,
        expiredAt: txData.expiredAt,
        baseAmount: txData.baseAmount,
        paymentMethod: 'qris',
      }), { status: 200, headers });
    }
  } catch (err) {
    console.error('create-transaction error:', err);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error: ' + err.message }), { status: 500, headers });
  }
}
