import { createTransaction } from './create-transaction.js';
import { instanpayWebhook } from './instanpay-webhook.js';
import { deleteUser } from './delete-user.js';
import { checkPayment } from './check-payment.js';

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
        if (path === '/.netlify/functions/check-payment') {
          return await checkPayment(request, env);
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
    try {
      if (env.ASSETS && env.ASSETS.fetch) {
        return await env.ASSETS.fetch(request);
      } else {
        throw new Error('env.ASSETS is undefined. [assets] binding failed.');
      }
    } catch (e) {
      return new Response('Frontend asset Error: ' + e.message, { status: 500 });
    }
  }
};
// Trigger redeploy to pick up new env vars
