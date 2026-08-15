import { firestoreQuery, firestoreUpdateDoc, firestoreGetDoc } from './instanpay-webhook.js';

export async function checkPayment(request, env) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = await request.json();
    const { merchantRef, instanpayApiKey, paymentMethod } = body;

    if (!merchantRef || !instanpayApiKey) {
      return new Response(JSON.stringify({ success: false, message: 'Data tidak lengkap' }), { status: 400, headers });
    }

    let isPaid = false;
    let amount = 0;

    if (paymentMethod === 'crypto') {
      // Instanpay Crypto Check
      const url = `https://instanpay.net/api/v1/crypto-payments/${merchantRef}`;
      const res = await fetch(url, {
        headers: { 'X-API-Key': instanpayApiKey }
      });
      const data = await res.json();
      
      if (data.success && data.data && (data.data.status === 'PAID' || data.data.status === 'SUCCESS' || data.data.status === 'SETTLEMENT')) {
        isPaid = true;
        amount = data.data.amount_usd;
      }
    } else {
      // Instanpay QRIS Check
      const url = `https://instanpay.net/api/v1/transactions/${merchantRef}`;
      const res = await fetch(url, {
        headers: { 'X-API-Key': instanpayApiKey }
      });
      const data = await res.json();
      
      if (data.success && data.data && (data.data.status === 'PAID' || data.data.status === 'SUCCESS' || data.data.status === 'SETTLEMENT')) {
        isPaid = true;
        amount = data.data.amount || data.data.totalAmount;
      }
    }

    if (isPaid) {
      // Update transaction in Firestore directly to prevent relying solely on webhook
      try {
        const txDoc = await firestoreQuery('transactions', 'merchantRef', 'EQUAL', merchantRef, env);
        if (txDoc && txDoc.fields.status?.stringValue !== 'PAID') {
          await firestoreUpdateDoc(txDoc.name, {
            status: { stringValue: 'PAID' },
            paidAt: { timestampValue: new Date().toISOString() }
          }, env);

          // Balance Allocation
          const projectId = txDoc.fields.projectId?.stringValue;
          const txAmount = parseFloat(amount) || parseFloat(txDoc.fields.originalAmount?.integerValue || txDoc.fields.originalAmount?.doubleValue || 0);

          if (projectId) {
            const projectDoc = await firestoreGetDoc('projects', projectId, env);
            const ownerId = projectDoc?.fields?.ownerId?.stringValue;

            if (ownerId) {
              const partnerDoc = await firestoreQuery('partners', 'userId', 'EQUAL', ownerId, env);
              if (partnerDoc && partnerDoc.fields.status?.stringValue === 'approved') {
                const currentBalance = parseFloat(partnerDoc.fields.balance?.integerValue || partnerDoc.fields.balance?.doubleValue || 0);
                const currentTotalEarnings = parseFloat(partnerDoc.fields.totalEarnings?.integerValue || partnerDoc.fields.totalEarnings?.doubleValue || 0);
                
                await firestoreUpdateDoc(partnerDoc.name, {
                  balance: { doubleValue: currentBalance + txAmount },
                  totalEarnings: { doubleValue: currentTotalEarnings + txAmount }
                }, env);
              }
            } else {
              const adminWallet = await firestoreGetDoc('settings', 'adminWallet', env);
              const currentBalance = adminWallet ? parseFloat(adminWallet.fields.balance?.integerValue || adminWallet.fields.balance?.doubleValue || 0) : 0;
              const name = adminWallet ? adminWallet.name : `projects/${env.VITE_FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/adminWallet`;
              await firestoreUpdateDoc(name, {
                balance: { doubleValue: currentBalance + txAmount }
              }, env);
            }
          }
        }
      } catch (e) {
        console.error('Error updating firestore on manual check:', e.message);
      }

      return new Response(JSON.stringify({ success: true, status: 'PAID' }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ success: true, status: 'PENDING' }), { status: 200, headers });

  } catch (err) {
    console.error('Check payment error:', err);
    return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers });
  }
}
