export async function checkDomain(request, env) {
  let domain;
  try {
    const body = await request.json();
    domain = body.domain;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
  
  if (!domain) {
    return new Response(JSON.stringify({ error: 'Missing domain parameter' }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
    });
  }

  // Determine if it's a known wildcard subdomain provider
  const wildcardExtensions = ['.netlify.app', '.vercel.app', '.web.app', '.firebaseapp.com'];
  const isWildcard = wildcardExtensions.some(ext => domain.endsWith(ext));

  try {
    if (isWildcard) {
      try {
        // Perform HTTP HEAD check because DNS always resolves for wildcards
        const res = await fetch(`https://${domain}`, { method: 'HEAD' });
        
        if (res.status === 404) {
          // Not found, so it's available
          return new Response(JSON.stringify({ available: true, domain }), { 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        } else {
          // Exists (200, 301, 403 etc)
          return new Response(JSON.stringify({ available: false, domain }), { 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        }
      } catch (fetchErr) {
        // If it fails to fetch entirely (e.g. DNS lookup failed), it's probably available
        return new Response(JSON.stringify({ available: true, domain }), { 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }
    } else {
      // For standard domains, use Google DNS over HTTPS
      const dnsRes = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
      const dnsData = await dnsRes.json();
      
      // Status 3 (NXDOMAIN) means the domain does not exist
      if (dnsData.Status === 3) {
        return new Response(JSON.stringify({ available: true, domain }), { 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      } else if (dnsData.Status === 0) {
        return new Response(JSON.stringify({ available: false, domain }), { 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      } else {
        return new Response(JSON.stringify({ error: 'DNS check failed', status: dnsData.Status }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
    });
  }
}
