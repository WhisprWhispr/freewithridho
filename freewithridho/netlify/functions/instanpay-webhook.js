import admin from 'firebase-admin';
const fetchFn = typeof fetch !== 'undefined' ? fetch : null;

// Initialize Firebase Admin once
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    // 1. Fetch Instanpay API Key from Firestore to verify the webhook
    let apiKey = process.env.INSTANPAY_API_KEY;
    if (admin.apps.length) {
      try {
        const db = admin.firestore();
        const settingsDoc = await db.collection('settings').doc('instanpay').get();
        if (settingsDoc.exists && settingsDoc.data().apiKey) {
          apiKey = settingsDoc.data().apiKey;
        }
      } catch (e) {
        console.warn('Could not read settings from Firestore:', e.message);
      }
    }

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, message: 'Instanpay API Key not configured' }),
      };
    }

    const data = JSON.parse(event.body);
    const reference = data.reference || data.transactionId;
    const webhookStatus = data.status;

    if (!reference) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'Missing reference in payload' }),
      };
    }

    // 2. Verify with Instanpay API to ensure this is not a spoofed webhook
    const INSTANPAY_URL = `https://instanpay.net/api/v1/payments/${reference}`;
    const res = await fetchFn(INSTANPAY_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': apiKey,
      },
    });

    if (!res.ok) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'Failed to verify transaction with Instanpay' }),
      };
    }

    const verificationData = await res.json();
    const actualStatus = verificationData.data?.status; // SUCCESS, EXPIRED, dll
    const amount = verificationData.data?.amount || verificationData.data?.baseAmount || data.amount;

    console.log(`Callback — Order: ${reference}, Webhook Status: ${webhookStatus}, Actual: ${actualStatus}`);

    // If actual status matches the paid status 
    if (actualStatus === 'SETTLEMENT' || actualStatus === 'SUCCESS' || actualStatus === 'PAID') {
      if (admin.apps.length) {
        try {
          const db = admin.firestore();
          const snapshot = await db
            .collection('transactions')
            .where('merchantRef', '==', reference)
            .get();

          if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            const txData = snapshot.docs[0].data();

            if (txData.status !== 'PAID' && txData.status !== 'SETTLEMENT' && txData.status !== 'SUCCESS') {
              await db.collection('transactions').doc(docId).update({
                status: 'PAID',
                paidAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              console.log(`✅ Transaction ${docId} updated to PAID`);

              // ── Balance Allocation: 100% Partner or 100% Admin ──
              if (txData.projectId) {
                try {
                  const projectDoc = await db.collection('projects').doc(txData.projectId).get();
                  const txAmount = parseFloat(amount) || parseFloat(txData.originalAmount) || 0;

                  if (projectDoc.exists && projectDoc.data().ownerId) {
                    // Project owned by partner
                    const ownerId = projectDoc.data().ownerId;
                    const partnerSnap = await db
                      .collection('partners')
                      .where('userId', '==', ownerId)
                      .where('status', '==', 'approved')
                      .get();

                    if (!partnerSnap.empty) {
                      const partnerDocId = partnerSnap.docs[0].id;
                      const partnerData = partnerSnap.docs[0].data();
                      const currentBalance = partnerData.balance || 0;
                      const currentTotalEarnings = partnerData.totalEarnings || 0;
                      await db.collection('partners').doc(partnerDocId).update({
                        balance: currentBalance + txAmount,
                        totalEarnings: currentTotalEarnings + txAmount,
                      });
                      console.log(`💰 Credited Rp ${txAmount} (100%) to partner ${partnerDocId}`);
                    }
                  } else {
                    // Project owned by admin
                    const adminWalletRef = db.collection('settings').doc('adminWallet');
                    const adminWalletDoc = await adminWalletRef.get();
                    const currentBalance = adminWalletDoc.exists
                      ? adminWalletDoc.data().balance || 0
                      : 0;
                    await adminWalletRef.set({ balance: currentBalance + txAmount }, { merge: true });
                    console.log(`💰 Credited Rp ${txAmount} (100%) to Admin Wallet`);
                  }
                } catch (splitErr) {
                  console.error('Balance allocation error:', splitErr.message);
                }
              }
            }
          } else {
            console.log(`❌ No transaction found for order: ${reference}`);
          }
        } catch (e) {
          console.error('Firestore update error:', e.message);
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Callback error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: 'Internal server error' }),
    };
  }
};
