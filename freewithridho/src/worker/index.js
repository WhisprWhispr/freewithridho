import { createTransaction } from './create-transaction.js';
import { instanpayWebhook } from './instanpay-webhook.js';
import { deleteUser } from './delete-user.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // Router for backend API
    try {
      if (request.method === 'POST') {
        if (path === '/.netlify/functions/create-transaction') {
          return await createTransaction(request, env);
        }
        if (path === '/.netlify/functions/instanpay-webhook') {
          return await instanpayWebhook(request, env);
        }
        if (path === '/.netlify/functions/delete-user') {
          return await deleteUser(request, env);
        }
      }
    } catch (err) {
      console.error('Worker API Error:', err);
      return new Response(JSON.stringify({ success: false, message: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Fallback to serve static frontend assets
    return env.ASSETS.fetch(request);
  }
};
// Trigger redeploy to pick up new env vars
