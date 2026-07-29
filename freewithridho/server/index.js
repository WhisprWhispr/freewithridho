require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Firebase project config — loaded from environment variables
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;

// Inisialisasi Firebase Admin (opsional, untuk fitur lain seperti delete user)
let db = null;
try {
  let serviceAccount;
  let envVal = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envVal) {
    if (envVal.startsWith("'") && envVal.endsWith("'")) envVal = envVal.slice(1, -1);
    serviceAccount = JSON.parse(envVal);
  } else {
    serviceAccount = require('./serviceAccountKey.json');
  }
  if (!admin.apps || !admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('Firebase Admin initialized successfully');
  }
  db = admin.firestore();
} catch (error) {
  console.log('Warning: Firebase Admin not initialized:', error.message);
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Baca environment dari Firestore REST API (tanpa service account)
async function getMidtransConfig() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/midtrans?key=${FIREBASE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Firestore REST error: ' + res.status);
    const data = await res.json();

    const environment = data.fields?.environment?.stringValue || 'sandbox';

    let serverKey;
    if (environment === 'production') {
      serverKey = process.env.MIDTRANS_SERVER_KEY_PRODUCTION;
      console.log('✅ Mode PRODUCTION — menggunakan MIDTRANS_SERVER_KEY_PRODUCTION');
    } else {
      serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX;
      console.log('✅ Mode SANDBOX — menggunakan MIDTRANS_SERVER_KEY_SANDBOX');
    }

    return { environment, serverKey };
  } catch (e) {
    console.warn('Gagal baca Firestore REST, fallback ke env vars:', e.message);
    const serverKey = process.env.MIDTRANS_SERVER_KEY_PRODUCTION || process.env.MIDTRANS_SERVER_KEY || null;
    const isSandbox = !serverKey || serverKey.includes('k_');
    return { environment: isSandbox ? 'sandbox' : 'production', serverKey };
  }
}

// 1. Endpoint: Create Transaction (Midtrans)
app.post('/api/create-transaction', async (req, res) => {
  const { projectId, userId, userEmail, projectTitle, amount } = req.body;

  if (!projectId || !userId || !userEmail || !amount) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
  }

  try {
    const { environment, serverKey } = await getMidtransConfig();

    if (!serverKey) {
      return res.status(500).json({ success: false, message: 'Midtrans Server Key tidak ditemukan. Tambahkan MIDTRANS_SERVER_KEY_SANDBOX / MIDTRANS_SERVER_KEY_PRODUCTION di file .env' });
    }

    const isSandbox = environment === 'sandbox';
    const MIDTRANS_URL = isSandbox
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
      : 'https://app.midtrans.com/snap/v1/transactions';

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
          name: (projectTitle || 'Source Code').substring(0, 50),
        }
      ],
      enabled_payments: ["gopay"],
      callbacks: {
        finish: req.headers.origin + '/success',
        unfinish: req.headers.origin + '/checkout/' + projectId,
        error: req.headers.origin + '/checkout/' + projectId,
      }
    };

    const authString = Buffer.from(`${serverKey}:`).toString('base64');
    
    // Gunakan global fetch (Node 18+)
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

    if (!midtransRes.ok) {
      const errMsg = midtransData.error_messages ? midtransData.error_messages[0] : JSON.stringify(midtransData);
      return res.status(400).json({ success: false, message: errMsg });
    }

    // Transaction akan disimpan/diupdate oleh frontend (PENDING) dan webhook (PAID)

    res.json({
      success: true,
      checkoutUrl: midtransData.redirect_url,
      reference: midtransData.token,
      merchantRef: orderId
    });

  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
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

// 3. Endpoint: Delete Firebase Auth User (Used by Admin Panel when Banning Partner)
app.post('/api/delete-user', async (req, res) => {
  if (!admin.apps || !admin.apps.length) {
    return res.status(500).json({ success: false, message: 'Firebase Admin SDK not initialized on backend' });
  }

  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Missing userId' });
    }

    // Delete the user from Firebase Auth
    await admin.auth().deleteUser(userId);
    console.log(`Successfully deleted user auth account: ${userId}`);

    res.json({ success: true, message: 'User auth account deleted.' });
  } catch (error) {
    console.error('Error deleting user auth:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Endpoint: Send Email (Nodemailer)
app.post('/api/send-email', async (req, res) => {
  const { toEmail, toName, projectTitle, downloadUrl, orderId, amount } = req.body;

  if (!toEmail || !projectTitle || !downloadUrl) {
    return res.status(400).json({ success: false, message: 'Data email tidak lengkap.' });
  }

  try {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT) || 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass || smtpPass.includes('xxxx')) {
      return res.status(400).json({ success: false, message: 'Kredensial SMTP belum diatur atau masih menggunakan template xxxx di file .env.' });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true untuk 465, false untuk port lainnya
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 2rem; border-radius: 12px; max-width: 600px; margin: auto; border: 1px solid rgba(255,255,255,0.08);">
        <div style="text-align: center; margin-bottom: 2rem;">
          <h1 style="color: #3b82f6; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.05em;">FREEWITHRIDHO</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Pembayaran Anda Telah Berhasil!</p>
        </div>
        
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
          <h3 style="color: #38bdf8; margin-top: 0; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">Detail Transaksi</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1;">
            <tr>
              <td style="padding: 0.5rem 0; color: #64748b;">No. Invoice:</td>
              <td style="padding: 0.5rem 0; text-align: right; font-weight: 600; color: #f8fafc;">${orderId || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 0.5rem 0; color: #64748b;">Nama Proyek:</td>
              <td style="padding: 0.5rem 0; text-align: right; font-weight: 600; color: #f8fafc;">${projectTitle}</td>
            </tr>
            <tr>
              <td style="padding: 0.5rem 0; color: #64748b;">Total Bayar:</td>
              <td style="padding: 0.5rem 0; text-align: right; font-weight: 600; color: #fbbf24;">Rp ${Number(amount).toLocaleString('id-ID')}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin-bottom: 2rem;">
          <p style="color: #cbd5e1; font-size: 15px; margin-bottom: 1.5rem;">Terima kasih telah berbelanja! Klik tombol di bawah ini untuk langsung mengunduh source code proyek Anda:</p>
          <a href="${downloadUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; padding: 0.8rem 2rem; border-radius: 50px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4); transition: transform 0.2s;">
            📥 Download Source Code
          </a>
        </div>
        
        <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.5rem; text-align: center; font-size: 12px; color: #64748b;">
          <p>Jika tombol di atas tidak berfungsi, Anda bisa menyalin tautan berikut ke browser Anda:</p>
          <p style="word-break: break-all; color: #38bdf8;">${downloadUrl}</p>
          <p style="margin-top: 1.5rem;">&copy; ${new Date().getFullYear()} FREEWITHRIDHO. All rights reserved.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"FREEWITHRIDHO Support" <${smtpUser}>`,
      to: toEmail,
      subject: `[FREEWITHRIDHO] Bukti Pembayaran & Link Download: ${projectTitle}`,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    res.json({ success: true, message: 'Email terkirim.' });

  } catch (error) {
    console.error('Error sending email via nodemailer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
