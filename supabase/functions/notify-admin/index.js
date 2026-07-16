import { withSupabase } from "@supabase/server";

// Pure Web Crypto helper to sign JWT and request Google OAuth2 token for FCM
async function generateAccessToken(serviceAccount) {
  const privateKeyPem = serviceAccount.private_key;
  const clientEmail = serviceAccount.client_email;
  const tokenUrl = "https://oauth2.googleapis.com/token";

  // Parse PEM key to Binary DER
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  // Import private key for signing
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: tokenUrl,
    exp: now + 3600,
    iat: now,
  };

  const textEncoder = new TextEncoder();
  const base64UrlEncode = (str) => {
    const bytes = typeof str === "string" ? textEncoder.encode(str) : str;
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = textEncoder.encode(`${encodedHeader}.${encodedPayload}`);

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    dataToSign
  );
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));

  const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

  // Request OAuth2 access token
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get OAuth token: ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const payload = await req.json();
      console.log('Received order webhook payload:', payload);

      const order = payload.record;
      if (!order) {
        return Response.json({ error: 'No order record found' }, { status: 400 });
      }

      // Query FCM tokens of admins
      const { data: admins, error: adminErr } = await ctx.supabase
        .from('profiles')
        .select('fcm_token')
        .eq('is_admin', true)
        .not('fcm_token', 'is', null);

      if (adminErr) {
        return Response.json({ error: adminErr.message }, { status: 500 });
      }

      const tokens = admins.map(a => a.fcm_token).filter(Boolean);
      if (tokens.length === 0) {
        return Response.json({ message: 'No registered admin FCM tokens found' });
      }

      // Retrieve Firebase service account from environment variables
      const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
      if (!serviceAccountStr) {
        return Response.json({ error: 'FIREBASE_SERVICE_ACCOUNT secret is not configured' }, { status: 500 });
      }

      const serviceAccount = JSON.parse(serviceAccountStr);
      const accessToken = await generateAccessToken(serviceAccount);

      const results = [];
      for (const token of tokens) {
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
        const fcmRes = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: {
              token: token,
              notification: {
                title: '🚨 طلب جديد وارد!',
                body: `طلب جديد رقم #${order.order_number || order.id} بقيمة ${order.total_amount} ج.س`
              },
              data: {
                orderNumber: String(order.order_number || order.id),
                type: 'new_order'
              },
              android: {
                priority: 'high',
                notification: {
                  sound: 'default',
                  click_action: 'OPEN_ADMIN_DASHBOARD'
                }
              }
            }
          })
        });

        const status = fcmRes.status;
        const respText = await fcmRes.text();
        results.push({ token: token.substring(0, 10) + '...', status, response: respText });
      }

      return Response.json({ message: 'Notifications processed', results });

    } catch (err) {
      console.error('Error in notify-admin function:', err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  })
};
