// Helper untuk memanggil Firestore REST API
async function firestoreQuery(collection, field, operator, value, env) {
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: operator,
          value: { stringValue: value }
        }
      },
      limit: 1
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) throw new Error(`Firestore query error: ${res.status}`);
  const data = await res.json();
  // runQuery returns an array of objects. If no document, it returns [{ readTime: "..." }]
  if (data[0] && data[0].document) {
    return {
      id: data[0].document.name.split('/').pop(),
      name: data[0].document.name,
      fields: data[0].document.fields
    };
  }
  return null;
}

async function firestoreGetDoc(collection, docId, env) {
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}?key=${apiKey}`;
  
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore get error: ${res.status}`);
  
  const data = await res.json();
  return {
    id: data.name.split('/').pop(),
    name: data.name,
    fields: data.fields
  };
}

async function firestoreUpdateDoc(name, fieldsToUpdate, env) {
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = env.VITE_FIREBASE_API_KEY;
  
  // Create updateMask
  const updateMask = Object.keys(fieldsToUpdate).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const url = `https://firestore.googleapis.com/v1/${name}?${updateMask}&key=${apiKey}`;
  
  const body = { fields: fieldsToUpdate };
  
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore update error: ${res.status} ${errText}`);
  }
}

export async function instanpayWebhook(request, env) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const data = await request.json();
    const reference = data.reference || data.transactionId;
    const webhookStatus = data.status;

    if (!reference) {
      return new Response(JSON.stringify({ success: false, message: 'Missing reference in payload' }), { status: 400, headers });
    }

    const actualStatus = webhookStatus;
    const amount = data.amount || data.totalAmount || data.baseAmount || 0;

    if (data.type === 'CRYPTO') {
      console.log(`Callback [CRYPTO] — Order: ${reference}, Status: ${actualStatus}, USD: ${data.amount_usd}, Hash: ${data.tx_hash}`);
    } else {
      console.log(`Callback [QRIS] — Order: ${reference}, Status: ${actualStatus}`);
    }

    if (actualStatus === 'SETTLEMENT' || actualStatus === 'SUCCESS' || actualStatus === 'PAID') {
      // Find transaction
      const txDoc = await firestoreQuery('transactions', 'merchantRef', 'EQUAL', reference, env);
      
      if (txDoc) {
        const txStatus = txDoc.fields.status?.stringValue;
        if (txStatus !== 'PAID' && txStatus !== 'SETTLEMENT' && txStatus !== 'SUCCESS') {
          // Update transaction to PAID
          await firestoreUpdateDoc(txDoc.name, {
            status: { stringValue: 'PAID' },
            paidAt: { timestampValue: new Date().toISOString() }
          }, env);
          console.log(`✅ Transaction ${txDoc.id} updated to PAID`);

          // Balance Allocation
          const projectId = txDoc.fields.projectId?.stringValue;
          const originalAmount = txDoc.fields.originalAmount?.integerValue || txDoc.fields.originalAmount?.doubleValue || 0;
          const txAmount = parseFloat(amount) || parseFloat(originalAmount) || 0;

          if (projectId) {
            try {
              const projectDoc = await firestoreGetDoc('projects', projectId, env);
              const ownerId = projectDoc?.fields?.ownerId?.stringValue;

              if (ownerId) {
                // Partner
                const partnerDoc = await firestoreQuery('partners', 'userId', 'EQUAL', ownerId, env);
                if (partnerDoc && partnerDoc.fields.status?.stringValue === 'approved') {
                  const currentBalance = parseFloat(partnerDoc.fields.balance?.integerValue || partnerDoc.fields.balance?.doubleValue || 0);
                  const currentTotalEarnings = parseFloat(partnerDoc.fields.totalEarnings?.integerValue || partnerDoc.fields.totalEarnings?.doubleValue || 0);
                  
                  await firestoreUpdateDoc(partnerDoc.name, {
                    balance: { doubleValue: currentBalance + txAmount },
                    totalEarnings: { doubleValue: currentTotalEarnings + txAmount }
                  }, env);
                  console.log(`💰 Credited Rp ${txAmount} to partner ${partnerDoc.id}`);
                }
              } else {
                // Admin
                const adminWallet = await firestoreGetDoc('settings', 'adminWallet', env);
                const currentBalance = adminWallet ? parseFloat(adminWallet.fields.balance?.integerValue || adminWallet.fields.balance?.doubleValue || 0) : 0;
                
                // If adminWallet doesn't exist, we must use full path for PATCH
                const name = adminWallet ? adminWallet.name : `projects/${env.VITE_FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/adminWallet`;
                await firestoreUpdateDoc(name, {
                  balance: { doubleValue: currentBalance + txAmount }
                }, env);
                console.log(`💰 Credited Rp ${txAmount} to Admin Wallet`);
              }
            } catch (splitErr) {
              console.error('Balance allocation error:', splitErr.message);
            }
          }
        }
      } else {
        console.log(`❌ No transaction found for order: ${reference}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (err) {
    console.error('Callback error:', err);
    return new Response(JSON.stringify({ success: false, message: 'Internal server error: ' + err.message }), { status: 500, headers });
  }
}
