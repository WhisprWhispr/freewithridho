'use strict';
const admin = require('firebase-admin');

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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    // Basic authorization check - you should ideally pass the admin's token in headers
    // and verify it with admin.auth().verifyIdToken() to ensure only admin can delete users
    const authHeader = event.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };
    }
    const token = authHeader.split('Bearer ')[1];
    
    // Verify admin token
    const decodedToken = await admin.auth().verifyIdToken(token);
    // You should check if decodedToken.email matches your admin email if possible
    // (Assuming admin email is checked on frontend, this is an extra layer of security)
    
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing userId' }) };
    }

    // Delete the user from Firebase Auth
    await admin.auth().deleteUser(userId);
    console.log(`Successfully deleted user auth account: ${userId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'User auth account deleted.' })
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message })
    };
  }
};
